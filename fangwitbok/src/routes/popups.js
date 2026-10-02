const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");

const router = express.Router();

const popupSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(1000),
  imageUrl: z.string().url().max(500).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
  startAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});

// GET /api/popups — สาธารณะ: เฉพาะ popup ที่ isActive และอยู่ในช่วงเวลาที่กำหนด เรียงตาม order
router.get("/", async (req, res) => {
  const now = new Date();
  const popups = await prisma.popup.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gte: now } }] },
      ],
    },
    orderBy: { order: "asc" },
    select: { id: true, title: true, body: true, imageUrl: true, order: true },
  });
  res.json({ popups });
});

// GET /api/admin/popups — Admin ดูทั้งหมด (รวมที่ปิดอยู่)
router.get("/admin/popups", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  const popups = await prisma.popup.findMany({ orderBy: { order: "asc" } });
  res.json({ popups });
});

// POST /api/admin/popups — สร้าง popup ใหม่ (สร้างได้หลายรายการพร้อมกัน กำหนดลำดับ/สถานะเอง)
router.post("/admin/popups", requireAuth, requireRole("ADMIN"), validateBody(popupSchema), async (req, res) => {
  const data = req.body;
  const popup = await prisma.popup.create({
    data: {
      title: sanitizeText(data.title),
      body: sanitizeText(data.body),
      imageUrl: data.imageUrl || null,
      order: data.order,
      isActive: data.isActive,
      startAt: data.startAt || null,
      endAt: data.endAt || null,
      createdById: req.user.id,
    },
  });
  await logAudit({ actorId: req.user.id, action: "POPUP_CREATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.status(201).json({ popup });
});

// PATCH /api/admin/popups/:id
router.patch("/admin/popups/:id", requireAuth, requireRole("ADMIN"), validateBody(popupSchema.partial()), async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });

  const data = req.body;
  const popup = await prisma.popup.update({
    where: { id: req.params.id },
    data: {
      ...(data.title !== undefined && { title: sanitizeText(data.title) }),
      ...(data.body !== undefined && { body: sanitizeText(data.body) }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      ...(data.order !== undefined && { order: data.order }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.startAt !== undefined && { startAt: data.startAt || null }),
      ...(data.endAt !== undefined && { endAt: data.endAt || null }),
    },
  });
  await logAudit({ actorId: req.user.id, action: "POPUP_UPDATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.json({ popup });
});

// DELETE /api/admin/popups/:id
router.delete("/admin/popups/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });

  await prisma.popup.delete({ where: { id: req.params.id } });
  await logAudit({ actorId: req.user.id, action: "POPUP_DELETE", targetType: "POPUP", targetId: req.params.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
