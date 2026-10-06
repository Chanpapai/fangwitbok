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
const MAX_IMAGES = 10;

// หัวข้อ/ข้อความ/รูป ไม่บังคับ แต่ต้องมีอย่างน้อย 1 อย่าง (Popup ที่มีแต่รูปได้)
const popupSchema = z.object({
  title: z.string().trim().max(100).optional().default(""),
  body: z.string().trim().max(1000).optional().default(""),
  images: z.array(z.string().regex(IMAGE_PATH)).max(MAX_IMAGES).optional(),
  order: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
  startAt: z.coerce.date().optional().nullable(),
  endAt: z.coerce.date().optional().nullable(),
});

const include = { images: { orderBy: { position: "asc" } } };

// รูปเดี่ยวแบบเก่า (imageUrl) ยังแสดงได้ ถ้า Popup นั้นยังไม่มีแถวใน PopupImage
const pathsOf = (p) => (p.images?.length ? p.images.map((i) => i.url) : p.imageUrl ? [p.imageUrl] : []);
const serialize = (p) => {
  const paths = pathsOf(p);
  return {
    id: p.id, title: p.title, body: p.body, order: p.order, isActive: p.isActive,
    images: paths.map((path) => ({ path, url: publicUrl(path) })).filter((i) => i.url),
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
    include,
  });
  res.set("Cache-Control", "public, max-age=30");
  res.json({
    popups: popups.map((p) => {
      const s = serialize(p);
      return { id: s.id, title: s.title, body: s.body, images: s.images.map((i) => i.url) };
    }),
  });
});

router.get("/admin/popups", ...staff, async (_req, res) => {
  const popups = await prisma.popup.findMany({ orderBy: { order: "asc" }, include });
  res.json({ popups: popups.map(serialize) });
});

const hasContent = (title, body, images) => Boolean(title || body || images?.length);

router.post("/admin/popups", ...staff, validateBody(popupSchema), async (req, res) => {
  const d = req.body;
  const title = sanitizeText(d.title);
  const body = sanitizeText(d.body);
  const images = d.images || [];
  if (!hasContent(title, body, images)) return res.status(400).json({ error: "กรุณาใส่หัวข้อ ข้อความ หรือรูปอย่างน้อย 1 อย่าง" });
  const popup = await prisma.popup.create({
    data: {
      title, body, order: d.order, isActive: d.isActive, startAt: d.startAt || null, endAt: d.endAt || null, createdById: req.user.id,
      images: { create: images.map((url, position) => ({ url, position })) },
    },
    include,
  });
  await logAudit({ actorId: req.user.id, action: "POPUP_CREATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.status(201).json({ popup: serialize(popup) });
});

router.patch("/admin/popups/:id", ...staff, validateBody(popupSchema.partial()), async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id }, include });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  const d = req.body;
  const nextTitle = d.title !== undefined ? sanitizeText(d.title) : existing.title;
  const nextBody = d.body !== undefined ? sanitizeText(d.body) : existing.body;
  const oldPaths = pathsOf(existing);
  const nextImages = d.images !== undefined ? d.images : oldPaths;
  if (!hasContent(nextTitle, nextBody, nextImages)) return res.status(400).json({ error: "Popup ต้องมีหัวข้อ ข้อความ หรือรูปอย่างน้อย 1 อย่าง" });

  const popup = await prisma.$transaction(async (tx) => {
    if (d.images !== undefined) {
      await tx.popupImage.deleteMany({ where: { popupId: existing.id } });
      await tx.popupImage.createMany({ data: nextImages.map((url, position) => ({ popupId: existing.id, url, position })) });
    }
    return tx.popup.update({
      where: { id: existing.id },
      data: {
        ...(d.title !== undefined && { title: nextTitle }),
        ...(d.body !== undefined && { body: nextBody }),
        ...(d.images !== undefined && { imageUrl: null }),
        ...(d.order !== undefined && { order: d.order }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
        ...(d.startAt !== undefined && { startAt: d.startAt || null }),
        ...(d.endAt !== undefined && { endAt: d.endAt || null }),
      },
      include,
    });
  });
  if (d.images !== undefined) {
    const removed = oldPaths.filter((p) => !nextImages.includes(p));
    await Promise.all(removed.map((p) => deleteImageFile(p)));
  }
  await logAudit({ actorId: req.user.id, action: "POPUP_UPDATE", targetType: "POPUP", targetId: popup.id, ipAddress: req.ip });
  res.json({ popup: serialize(popup) });
});

router.delete("/admin/popups/:id", ...staff, async (req, res) => {
  const existing = await prisma.popup.findUnique({ where: { id: req.params.id }, include });
  if (!existing) return res.status(404).json({ error: "ไม่พบ Popup นี้" });
  await prisma.popup.delete({ where: { id: existing.id } });
  await Promise.all(pathsOf(existing).map((p) => deleteImageFile(p)));
  await logAudit({ actorId: req.user.id, action: "POPUP_DELETE", targetType: "POPUP", targetId: existing.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
