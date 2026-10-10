const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { supportCreateLimiter, supportMessageLimiter, writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { notifyAdmins } = require("../utils/notify");
const { newSecret, sha256, hashIp } = require("../utils/guest");

const router = express.Router();

const msgSchema = z.object({ body: z.string().trim().min(1, "กรุณาพิมพ์ข้อความ").max(1000) });
const createSchema = msgSchema; // ไม่รับช่อง "ติดต่อกลับ" แบบเดิมอีกต่อไป (ผู้เข้าชมได้คำตอบในห้องแชทของตัวเองอยู่แล้ว)

// unread = ข้อความของ "อีกฝ่าย" ที่ผู้ดูยังไม่ได้เห็น (viewer: VISITOR หรือ ADMIN) — หน้าเว็บใช้คำนวณปุ่มกระดิ่ง
const serializeMsg = (m, viewer) => ({
  id: m.id, sender: m.sender, adminName: m.adminName, body: m.body, createdAt: m.createdAt,
  unread: viewer ? m.sender !== viewer && !m.isRead : false,
});

const readSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(100) });

// ทำเครื่องหมาย "อ่านแล้ว" เฉพาะข้อความของอีกฝ่ายในห้องนี้ แล้วคำนวณตัวนับค้างอ่านใหม่จากข้อมูลจริง (ไม่เดาด้วยการ +/-)
async function markRead(thread, viewer, ids) {
  const other = viewer === "VISITOR" ? "ADMIN" : "VISITOR";
  await prisma.supportMessage.updateMany({ where: { threadId: thread.id, sender: other, isRead: false, id: { in: ids } }, data: { isRead: true } });
  const unread = await prisma.supportMessage.count({ where: { threadId: thread.id, sender: other, isRead: false } });
  await prisma.supportThread.update({ where: { id: thread.id }, data: viewer === "VISITOR" ? { unreadForVisitor: unread } : { unreadForAdmin: unread } });
  return unread;
}

/** หาห้องแชทจากโทเคนในเครื่องผู้เข้าชม (DB เก็บแค่ hash) */
async function threadFromToken(req) {
  const t = req.headers["x-thread-token"];
  if (typeof t !== "string" || t.length < 32 || t.length > 128) return null;
  return prisma.supportThread.findUnique({ where: { tokenHash: sha256(t) } });
}

// POST /api/support/threads — เริ่มแชทใหม่ (ไม่ต้อง Login)
router.post("/support/threads", supportCreateLimiter, validateBody(createSchema), async (req, res) => {
  const secret = newSecret();
  const body = sanitizeText(req.body.body);
  const thread = await prisma.supportThread.create({
    data: {
      tokenHash: secret.hash,
      ipHash: hashIp(req.ip),
      unreadForAdmin: 1,
      messages: { create: { sender: "VISITOR", body, isRead: false } },
    },
    include: { messages: true },
  });
  notifyAdmins({
    type: "SUPPORT_MESSAGE", title: "มีข้อความแจ้งปัญหาใหม่", body: body.slice(0, 100),
    relatedType: "SUPPORT", relatedId: thread.id,
  }).catch((e) => console.error("[notify]", e.message));
  res.status(201).json({ threadToken: secret.token, status: thread.status, messages: thread.messages.map((m) => serializeMsg(m, "VISITOR")) });
});

// GET /api/support/thread — ผู้เข้าชมดูแชทของตัวเอง (หน้าเว็บ poll ทุก ~10 วินาทีตอนเปิดแชท)
router.get("/support/thread", async (req, res) => {
  const thread = await threadFromToken(req);
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id }, orderBy: { createdAt: "asc" }, take: 200,
  });
  // ไม่ล้างตัวนับตอนดึงข้อมูลอีกต่อไป: ถือว่า "อ่านแล้ว" ก็ต่อเมื่อหน้าเว็บแจ้งว่าข้อความนั้นถูกเลื่อนมาเห็นจริง (POST /support/read)
  res.json({ status: thread.status, unread: thread.unreadForVisitor, messages: messages.map((m) => serializeMsg(m, "VISITOR")) });
});

// POST /api/support/read — ผู้เข้าชมแจ้งว่าเห็นข้อความของแอดมินเหล่านี้แล้ว
router.post("/support/read", validateBody(readSchema), async (req, res) => {
  const thread = await threadFromToken(req);
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  res.json({ unread: await markRead(thread, "VISITOR", req.body.ids) });
});

// GET /api/support/unread — เช็คจำนวนข้อความใหม่แบบเบา ๆ (ไม่ดึงข้อความ)
router.get("/support/unread", async (req, res) => {
  const thread = await threadFromToken(req);
  res.json({ unread: thread?.unreadForVisitor ?? 0 });
});

// POST /api/support/messages — ผู้เข้าชมส่งข้อความเพิ่ม
router.post("/support/messages", supportMessageLimiter, validateBody(msgSchema), async (req, res) => {
  const thread = await threadFromToken(req);
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const body = sanitizeText(req.body.body);
  const m = await prisma.supportMessage.create({ data: { threadId: thread.id, sender: "VISITOR", body, isRead: false } });
  await prisma.supportThread.update({
    where: { id: thread.id },
    data: { status: "OPEN", unreadForAdmin: { increment: 1 }, lastMessageAt: new Date() },
  });
  if (thread.unreadForAdmin === 0) {
    notifyAdmins({
      type: "SUPPORT_MESSAGE", title: "มีข้อความแจ้งปัญหาใหม่", body: body.slice(0, 100),
      relatedType: "SUPPORT", relatedId: thread.id,
    }).catch(() => {});
  }
  res.status(201).json({ message: serializeMsg(m, "VISITOR") });
});

// ---------------- Admin ----------------
const staff = [requireAuth, requireRole("ADMIN")];

router.get("/admin/support", ...staff, async (req, res) => {
  const status = req.query.status === "CLOSED" ? "CLOSED" : "OPEN";
  const threads = await prisma.supportThread.findMany({
    where: { status },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    select: {
      id: true, status: true, unreadForAdmin: true, lastMessageAt: true, createdAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, sender: true } },
    },
  });
  res.json({
    threads: threads.map(({ messages, ...t }) => ({ ...t, lastMessage: messages[0] || null })),
  });
});

router.get("/admin/support/unread-count", ...staff, async (_req, res) => {
  const agg = await prisma.supportThread.aggregate({ where: { unreadForAdmin: { gt: 0 } }, _count: true });
  res.json({ count: agg._count });
});

router.get("/admin/support/:id", ...staff, async (req, res) => {
  const thread = await prisma.supportThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const messages = await prisma.supportMessage.findMany({ where: { threadId: thread.id }, orderBy: { createdAt: "asc" }, take: 300 });
  res.json({ thread: { id: thread.id, status: thread.status }, messages: messages.map((m) => serializeMsg(m, "ADMIN")) });
});

router.post("/admin/support/:id/read", ...staff, validateBody(readSchema), async (req, res) => {
  const thread = await prisma.supportThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  res.json({ unread: await markRead(thread, "ADMIN", req.body.ids) });
});

router.post("/admin/support/:id/reply", ...staff, writeLimiter, validateBody(msgSchema), async (req, res) => {
  const thread = await prisma.supportThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const m = await prisma.supportMessage.create({
    data: { threadId: thread.id, sender: "ADMIN", adminName: req.user.displayName, body: sanitizeText(req.body.body), isRead: false },
  });
  await prisma.supportThread.update({
    where: { id: thread.id }, data: { unreadForVisitor: { increment: 1 }, lastMessageAt: new Date() },
  });
  res.status(201).json({ message: serializeMsg(m, "ADMIN") });
});

router.patch("/admin/support/:id", ...staff, validateBody(z.object({ status: z.enum(["OPEN", "CLOSED"]) })), async (req, res) => {
  const t = await prisma.supportThread.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!t) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  await prisma.supportThread.update({ where: { id: t.id }, data: { status: req.body.status } });
  res.json({ ok: true });
});

module.exports = router;
