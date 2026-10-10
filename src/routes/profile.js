const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { upload } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");
const { publicUrl } = require("../config/storage");
const { parseSocialUrl } = require("../utils/links");

const router = express.Router();

// โปรไฟล์ของบัญชีที่ล็อกอิน (ทีมงาน): ส่ง/รับเฉพาะของ "ตัวเอง" เท่านั้น — ไม่มี endpoint ดูโปรไฟล์คนอื่น
// ลิงก์ IG/FB เป็นข้อมูลส่วนตัว ไม่ปรากฏใน API สาธารณะใด ๆ (ถ้าจะให้คนเห็น ต้องเลือกใส่ในโพสต์เอง)
const mine = (u) => ({
  displayName: u.displayName, instagramUrl: u.instagramUrl || "", facebookUrl: u.facebookUrl || "", avatarUrl: publicUrl(u.avatarUrl),
});
const SELECT = { displayName: true, instagramUrl: true, facebookUrl: true, avatarUrl: true };

router.get("/profile", requireAuth, async (req, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.user.id }, select: SELECT });
  res.json({ profile: mine(u) });
});

const schema = z.object({
  instagramUrl: z.string().trim().max(300).optional().default(""),
  facebookUrl: z.string().trim().max(300).optional().default(""),
});

router.put("/profile", requireAuth, writeLimiter, validateBody(schema), async (req, res) => {
  const ig = parseSocialUrl(req.body.instagramUrl, ["INSTAGRAM"]);
  if (ig.error) return res.status(400).json({ error: `Instagram: ${ig.error}` });
  const fb = parseSocialUrl(req.body.facebookUrl, ["FACEBOOK"]);
  if (fb.error) return res.status(400).json({ error: `Facebook: ${fb.error}` });
  const u = await prisma.user.update({
    where: { id: req.user.id }, data: { instagramUrl: ig.url || null, facebookUrl: fb.url || null }, select: SELECT,
  });
  res.json({ profile: mine(u) });
});

router.post("/profile/avatar", requireAuth, writeLimiter, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "ไม่พบไฟล์รูป" });
  try {
    const [img] = await processAndSaveImages([req.file], "avatars"); // ตรวจชนิดจากไบต์จริง + ย่อ + เก็บถาวรใน Storage
    const old = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatarUrl: true } });
    const u = await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl: img.path }, select: SELECT });
    if (old?.avatarUrl && old.avatarUrl !== img.path) await deleteImageFile(old.avatarUrl);
    res.status(201).json({ profile: mine(u) });
  } catch (err) {
    console.error("[avatar]", err.message);
    if (err.code === "STORAGE_NOT_CONFIGURED") return res.status(503).json({ error: "ยังไม่ได้ตั้งค่า Supabase Storage" });
    if (String(err.message).startsWith("Supabase upload failed")) return res.status(503).json({ error: "ที่เก็บรูปขัดข้อง กรุณาลองใหม่" });
    res.status(400).json({ error: "อัปโหลดรูปไม่สำเร็จ ไฟล์อาจเสียหายหรือไม่ใช่รูปภาพ" });
  }
});

router.delete("/profile/avatar", requireAuth, writeLimiter, async (req, res) => {
  const old = await prisma.user.findUnique({ where: { id: req.user.id }, select: { avatarUrl: true } });
  const u = await prisma.user.update({ where: { id: req.user.id }, data: { avatarUrl: null }, select: SELECT });
  if (old?.avatarUrl) await deleteImageFile(old.avatarUrl);
  res.json({ profile: mine(u) });
});

module.exports = router;
