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
const createSchema = msgSchema.extend({ contact: z.string().trim().max(100).optional().default("") });

const serializeMsg = (m) => ({ id: m.id, sender: m.sender, adminName: m.adminName, body: m.body, createdAt: m.createdAt });

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
      contact: sanitizeText(req.body.contact) || null,
      ipHash: hashIp(req.ip),
      unreadForAdmin: 1,
      messages: { create: { sender: "VISITOR", body } },
    },
    include: { messages: true },
  });
  notifyAdmins({
    type: "SUPPORT_MESSAGE", title: "มีข้อความแจ้งปัญหาใหม่", body: body.slice(0, 100),
    relatedType: "SUPPORT", relatedId: thread.id,
  }).catch((e) => console.error("[notify]", e.message));
  res.status(201).json({ threadToken: secret.token, status: thread.status, messages: thread.messages.map(serializeMsg) });
});

// GET /api/support/thread — ผู้เข้าชมดูแชทของตัวเอง (หน้าเว็บ poll ทุก ~10 วินาทีตอนเปิดแชท)
router.get("/support/thread", async (req, res) => {
  const thread = await threadFromToken(req);
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const messages = await prisma.supportMessage.findMany({
    where: { threadId: thread.id }, orderBy: { createdAt: "asc" }, take: 200,
  });
  if (thread.unreadForVisitor > 0) {
    await prisma.supportThread.update({ where: { id: thread.id }, data: { unreadForVisitor: 0 } });
  }
  res.json({ status: thread.status, unread: thread.unreadForVisitor, messages: messages.map(serializeMsg) });
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
  const m = await prisma.supportMessage.create({ data: { threadId: thread.id, sender: "VISITOR", body } });
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
  res.status(201).json({ message: serializeMsg(m) });
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
      id: true, contact: true, status: true, unreadForAdmin: true, lastMessageAt: true, createdAt: true,
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
  if (thread.unreadForAdmin > 0) await prisma.supportThread.update({ where: { id: thread.id }, data: { unreadForAdmin: 0 } });
  res.json({ thread: { id: thread.id, contact: thread.contact, status: thread.status }, messages: messages.map(serializeMsg) });
});

router.post("/admin/support/:id/reply", ...staff, writeLimiter, validateBody(msgSchema), async (req, res) => {
  const thread = await prisma.supportThread.findUnique({ where: { id: req.params.id } });
  if (!thread) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  const m = await prisma.supportMessage.create({
    data: { threadId: thread.id, sender: "ADMIN", adminName: req.user.displayName, body: sanitizeText(req.body.body) },
  });
  await prisma.supportThread.update({
    where: { id: thread.id }, data: { unreadForVisitor: { increment: 1 }, unreadForAdmin: 0, lastMessageAt: new Date() },
  });
  res.status(201).json({ message: serializeMsg(m) });
});

router.patch("/admin/support/:id", ...staff, validateBody(z.object({ status: z.enum(["OPEN", "CLOSED"]) })), async (req, res) => {
  const t = await prisma.supportThread.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!t) return res.status(404).json({ error: "ไม่พบห้องแชท" });
  await prisma.supportThread.update({ where: { id: t.id }, data: { status: req.body.status } });
  res.json({ ok: true });
});

module.exports = router;
