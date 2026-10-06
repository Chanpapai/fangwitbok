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
const MAX_IMAGES = 8;

// หัวข้อ/ข้อความไม่บังคับทั้งคู่ — Popup ที่มีเฉพาะรูปภาพได้ (ต้องมีอย่างน้อยหนึ่งอย่าง)
const baseSchema = z.object({
  title: z.string().trim().max(100).optional().default(""),
  body: z.string().trim().max(1000).optional().default(""),
  images: z.array(z.string().regex(IMAGE_PATH)).max(MAX_IMAGES).optional(),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});
const EMPTY_MSG = "Popup ต้องมีอย่างน้อยหนึ่งอย่าง: หัวข้อ ข้อความ หรือรูปภาพ";
const createSchema = baseSchema.refine((d) => d.title || d.body || (d.images && d.images.length), { message: EMPTY_MSG });
const patchSchema = baseSchema.partial();

// รูปของ Popup = images[] (ใหม่) หรือ imageUrl เดียว (ข้อมูลเดิม) — รวมเป็นรายการเดียวเสมอ
const pathsOf = (p) => (p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : []);
const serialize = (p) => {
  const paths = pathsOf(p);
  return {
    id: p.id, title: p.title, body: p.body, order: p.order, isActive: p.isActive, startAt: p.startAt, endAt: p.endAt,
    imagePaths: paths, images: paths.map(publicUrl).filter(Boolean),
  };
};

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
    select: { id: true, title: true, body: true, imageUrl: true, images: true },
  });
  res.set("Cache-Control", "public, max-age=30");
  res.json({
    popups: popups
      .map((p) => ({ id: p.id, title: p.title, body: p.body, images: pathsOf(p).map(publicUrl).filter(Boolean) }))
      .filter((p) => p.title || p.body || p.images.length), // รูปเสียทั้งหมด+ไม่มีข้อความ = ไม่แสดงกล่องว่าง
  });
});

router.get("/admin/popups", ...staff, async (_req, res) => {
  const popups = await prisma.popup.findMany({ orderBy: { order: "asc" } });
  res.json({ popups: popups.map(serialize) });
});

router.post("/admin/popups", ...staff, validateBody(createSchema), async (req, res) => {
  const d = req.body;
  const images = d.images || [];
  const popup = await prisma.popup.create({
    data: {
      title: sanitizeText(d.title), body: sanitizeText(d.body), images, imageUrl: images[0] || null,
      order: d.order, isActive: d.isActive, startAt: d.startAt || null, endAt: d.endAt || null, createdById: req.user.id,
    },
  });
  await logAudit({ actorId: req.user.id, action: "POPUP_CREATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.status(201).json({ popup: serialize(popup) });
});

router.patch("/admin/popups/:id", ...staff, validateBody(patchSchema), async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  const d = req.body;

  const title = d.title !== undefined ? sanitizeText(d.title) : existing.title;
  const body = d.body !== undefined ? sanitizeText(d.body) : existing.body;
  const oldPaths = pathsOf(existing);
  const images = d.images !== undefined ? d.images : oldPaths;
  if (!title && !body && images.length === 0) return res.status(400).json({ error: EMPTY_MSG });

  const popup = await prisma.popup.update({
    where: { id: existing.id },
    data: {
      title, body,
      ...(d.images !== undefined && { images, imageUrl: images[0] || null }),
      ...(d.order !== undefined && { order: d.order }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
      ...(d.startAt !== undefined && { startAt: d.startAt || null }),
      ...(d.endAt !== undefined && { endAt: d.endAt || null }),
    },
  });
  // รูปที่ถูกเอาออกจาก Popup -> ลบไฟล์ใน Storage (ประหยัดพื้นที่)
  if (d.images !== undefined) await Promise.all(oldPaths.filter((p) => !images.includes(p)).map(deleteImageFile));
  await logAudit({ actorId: req.user.id, action: "POPUP_UPDATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.json({ popup: serialize(popup) });
});

router.delete("/admin/popups/:id", ...staff, async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  await prisma.popup.delete({ where: { id: existing.id } });
  await Promise.all(pathsOf(existing).map(deleteImageFile));
  await logAudit({ actorId: req.user.id, action: "POPUP_DELETE", targetType: "POPUP", targetId: existing.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
