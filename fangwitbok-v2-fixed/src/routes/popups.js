const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { publicUrl } = require("../config/storage");
const { deleteImageFile } = require("../utils/image");

const router = express.Router();
const staff = [requireAuth, requireRole("ADMIN")];
const IMAGE_PATH = /^popups\/[0-9]+-[a-f0-9]{16}\.webp$/;

const popupSchema = z.object({
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(1000),
  imageUrl: z.string().regex(IMAGE_PATH).optional().nullable().or(z.literal("")),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

const serialize = (p) => ({ ...p, imagePath: p.imageUrl, imageUrl: publicUrl(p.imageUrl) });

// GET /api/popups — สาธารณะ: เฉพาะ popup ที่เปิดอยู่และอยู่ในช่วงเวลา (cache สั้น ๆ ลด query)
router.get("/popups", async (_req, res) => {
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
    take: 20,
    select: { id: true, title: true, body: true, imageUrl: true, order: true },
  });
  res.set("Cache-Control", "public, max-age=30");
  res.json({ popups: popups.map((p) => ({ ...p, imageUrl: publicUrl(p.imageUrl) })) });
});

router.get("/admin/popups", ...staff, async (_req, res) => {
  const popups = await prisma.popup.findMany({ orderBy: { order: "asc" } });
  res.json({ popups: popups.map(serialize) });
});

router.post("/admin/popups", ...staff, validateBody(popupSchema), async (req, res) => {
  const d = req.body;
  const popup = await prisma.popup.create({
    data: {
      title: sanitizeText(d.title), body: sanitizeText(d.body), imageUrl: d.imageUrl || null,
      order: d.order, isActive: d.isActive, startAt: d.startAt || null, endAt: d.endAt || null, createdById: req.user.id,
    },
  });
  await logAudit({ actorId: req.user.id, action: "POPUP_CREATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.status(201).json({ popup: serialize(popup) });
});

router.patch("/admin/popups/:id", ...staff, validateBody(popupSchema.partial()), async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  const d = req.body;
  const popup = await prisma.popup.update({
    where: { id: existing.id },
    data: {
      ...(d.title !== undefined && { title: sanitizeText(d.title) }),
      ...(d.body !== undefined && { body: sanitizeText(d.body) }),
      ...(d.imageUrl !== undefined && { imageUrl: d.imageUrl || null }),
      ...(d.order !== undefined && { order: d.order }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.startAt !== undefined && { startAt: d.startAt || null }),
      ...(d.endAt !== undefined && { endAt: d.endAt || null }),
    },
  });
  if (d.imageUrl !== undefined && existing.imageUrl && existing.imageUrl !== (d.imageUrl || null)) {
    await deleteImageFile(existing.imageUrl);
  }
  await logAudit({ actorId: req.user.id, action: "POPUP_UPDATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.json({ popup: serialize(popup) });
});

router.delete("/admin/popups/:id", ...staff, async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  await prisma.popup.delete({ where: { id: existing.id } });
  await deleteImageFile(existing.imageUrl);
  await logAudit({ actorId: req.user.id, action: "POPUP_DELETE", targetType: "POPUP", targetId: existing.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
