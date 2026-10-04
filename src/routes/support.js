const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { generateOwnerToken, hashOwnerToken, matchesOwnerToken } = require("../utils/ownerToken");
const { notifyAdmins } = require("../utils/notify");

const router = express.Router();

const msgSchema = z.object({ content: z.string().trim().min(1).max(1000) });

// POST /api/support/tickets — เริ่มแจ้งปัญหาใหม่ (ไม่ต้องล็อกอิน) คืน visitorToken ให้เก็บไว้
router.post("/support/tickets", writeLimiter, (req, res, next) => validateAndCreate(req, res).catch(next));
async function validateAndCreate(req, res) {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "กรุณากรอกข้อความ" });

  const { token, tokenHash } = generateOwnerToken();
  const ticket = await prisma.supportTicket.create({
    data: { visitorTokenHash: tokenHash, messages: { create: { sender: "VISITOR", content: sanitizeText(parsed.data.content) } } },
    include: { messages: true },
  });
  notifyAdmins({ type: "NEW_SUPPORT_TICKET", title: "มีการแจ้งปัญหาใหม่", body: parsed.data.content.slice(0, 100), relatedType: "SUPPORT", relatedId: ticket.id }).catch(() => {});
  res.status(201).json({ visitorToken: token, ticket: { id: ticket.id, status: ticket.status, messages: ticket.messages } });
}

function requireVisitorToken(req, res, next) {
  const token = req.headers["x-visitor-token"];
  if (!token) return res.status(401).json({ error: "ไม่พบโทเคนผู้เยี่ยมชม" });
  req.visitorTokenHash = hashOwnerToken(token);
  next();
}

// GET /api/support/tickets/me — ดูบทสนทนาของตัวเอง (ยืนยันด้วย x-visitor-token)
router.get("/support/tickets/me", requireVisitorToken, async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { visitorTokenHash: req.visitorTokenHash }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!ticket) return res.status(404).json({ error: "ไม่พบการสนทนา" });
  res.json({ ticket });
});

// POST /api/support/tickets/me/messages — ผู้เยี่ยมชมส่งข้อความต่อ
router.post("/support/tickets/me/messages", requireVisitorToken, writeLimiter, async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "กรุณากรอกข้อความ" });
  const ticket = await prisma.supportTicket.findUnique({ where: { visitorTokenHash: req.visitorTokenHash } });
  if (!ticket) return res.status(404).json({ error: "ไม่พบการสนทนา" });

  const msg = await prisma.supportMessage.create({ data: { ticketId: ticket.id, sender: "VISITOR", content: sanitizeText(parsed.data.content) } });
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: "OPEN" } });
  res.status(201).json({ message: msg });
});

// ---------- Admin ----------
router.get("/admin/support/tickets", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const status = req.query.status === "CLOSED" ? "CLOSED" : "OPEN";
  const tickets = await prisma.supportTicket.findMany({ where: { status }, include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } }, orderBy: { updatedAt: "desc" } });
  res.json({ tickets });
});

router.get("/admin/support/tickets/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id }, include: { messages: { orderBy: { createdAt: "asc" } } } });
  if (!ticket) return res.status(404).json({ error: "ไม่พบการสนทนา" });
  res.json({ ticket });
});

router.post("/admin/support/tickets/:id/reply", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const parsed = msgSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "กรุณากรอกข้อความ" });
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: "ไม่พบการสนทนา" });

  const msg = await prisma.supportMessage.create({ data: { ticketId: ticket.id, sender: "ADMIN", senderAdminId: req.user.id, content: sanitizeText(parsed.data.content) } });
  res.status(201).json({ message: msg });
});

router.post("/admin/support/tickets/:id/close", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.supportTicket.update({ where: { id: req.params.id }, data: { status: "CLOSED" } });
  res.json({ ok: true });
});

module.exports = router;
