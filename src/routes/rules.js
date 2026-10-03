const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { publicUrl } = require("../config/storage");
const { upload } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");

const router = express.Router();
const staff = [requireAuth, requireRole("ADMIN")];

// path รูปที่ยอมรับ: ต้องเป็นไฟล์ที่ Backend เพิ่งอัปโหลดเองเท่านั้น
const IMAGE_PATH = /^(rules|popups)\/[0-9]+-[a-f0-9]{16}\.webp$/;

const serialize = (b) => ({
  id: b.id, type: b.type, text: b.text, imagePath: b.imageUrl, imageUrl: publicUrl(b.imageUrl), position: b.position,
});

// GET /api/rules — สาธารณะ
router.get("/rules", async (_req, res) => {
  const blocks = await prisma.ruleBlock.findMany({ orderBy: { position: "asc" } });
  res.set("Cache-Control", "public, max-age=30");
  res.json({ blocks: blocks.map(serialize) });
});

// POST /api/admin/upload/:folder — Admin อัปโหลดรูปสำหรับกฎ/Popup (คืน path + URL)
router.post("/admin/upload/:folder", ...staff, writeLimiter, upload.single("image"), async (req, res) => {
  const folder = req.params.folder;
  if (!["rules", "popups"].includes(folder)) return res.status(400).json({ error: "โฟลเดอร์ไม่ถูกต้อง" });
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์รูป" });
  try {
    const [img] = await processAndSaveImages([req.file], folder);
    res.status(201).json({ path: img.path, url: publicUrl(img.path), width: img.width, height: img.height });
  } catch (err) {
    console.error("[upload]", err.message);
    if (err.code === "STORAGE_NOT_CONFIGURED") return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า Supabase Storage" });
    res.status(400).json({ error: "อัปโหลดรูปไม่สำเร็จ ไฟล์อาจเสียหายหรือไม่ใช่รูปภาพ" });
  }
});

const blockSchema = z.object({
  type: z.enum(["TEXT", "IMAGE"]),
  text: z.string().trim().max(3000).optional().default(""),
  imageUrl: z.string().regex(IMAGE_PATH).optional().nullable(),
});

router.post("/admin/rules", ...staff, writeLimiter, validateBody(blockSchema), async (req, res) => {
  const { type, text, imageUrl } = req.body;
  if (type === "TEXT" && !text) return res.status(400).json({ error: "กรุณากรอกข้อความ" });
  if (type === "IMAGE" && !imageUrl) return res.status(400).json({ error: "กรุณาอัปโหลดรูป" });
  const last = await prisma.ruleBlock.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  const block = await prisma.ruleBlock.create({
    data: {
      type, text: type === "TEXT" ? sanitizeText(text) : sanitizeText(text) || null,
      imageUrl: type === "IMAGE" ? imageUrl : null, position: (last?.position ?? -1) + 1,
    },
  });
  await logAudit({ actorId: req.user.id, action: "RULE_CREATE", targetType: "RULE", targetId: block.id, ipAddress: req.ip });
  res.status(201).json({ block: serialize(block) });
});

router.patch("/admin/rules/:id", ...staff, writeLimiter, validateBody(blockSchema.partial()), async (req, res) => {
  const existing = await prisma.ruleBlock.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบบล็อกนี้" });
  const data = {};
  if (req.body.text !== undefined) data.text = sanitizeText(req.body.text) || null;
  if (req.body.imageUrl !== undefined && existing.type === "IMAGE") data.imageUrl = req.body.imageUrl;
  const block = await prisma.ruleBlock.update({ where: { id: existing.id }, data });
  if (data.imageUrl && data.imageUrl !== existing.imageUrl) await deleteImageFile(existing.imageUrl); // เปลี่ยนรูป = ลบรูปเก่า ประหยัด Storage
  await logAudit({ actorId: req.user.id, action: "RULE_UPDATE", targetType: "RULE", targetId: block.id, ipAddress: req.ip });
  res.json({ block: serialize(block) });
});

router.delete("/admin/rules/:id", ...staff, async (req, res) => {
  const existing = await prisma.ruleBlock.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบบล็อกนี้" });
  await prisma.ruleBlock.delete({ where: { id: existing.id } });
  await deleteImageFile(existing.imageUrl);
  await logAudit({ actorId: req.user.id, action: "RULE_DELETE", targetType: "RULE", targetId: existing.id, ipAddress: req.ip });
  res.json({ ok: true });
});

// POST /api/admin/rules/reorder { ids: [...] } — จัดลำดับใหม่ทั้งชุด
router.post("/admin/rules/reorder", ...staff, validateBody(z.object({ ids: z.array(z.string().uuid()).max(200) })), async (req, res) => {
  await prisma.$transaction(req.body.ids.map((id, i) => prisma.ruleBlock.update({ where: { id }, data: { position: i } })));
  res.json({ ok: true });
});

module.exports = router;
