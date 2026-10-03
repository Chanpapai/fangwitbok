const express = require("express");
const prisma = require("../config/db");
const { likeLimiter } = require("../middleware/rateLimit");
const { voterKeyFrom } = require("../utils/guest");

const router = express.Router();

// POST /api/posts/:postId/like — กดใจ/เอาออก (toggle) ต่ออุปกรณ์ 1 ครั้ง ป้องกันซ้ำด้วย unique constraint ใน DB
// ไม่ต้อง Login: ใช้รหัสอุปกรณ์สุ่มที่หน้าเว็บสร้างเอง (กันกดรัวแบบง่าย ๆ ไม่ใช่ระบบยืนยันตัวตน)
router.post("/:postId/like", likeLimiter, async (req, res) => {
  const voterKey = voterKeyFrom(req);
  if (!voterKey) return res.status(400).json({ error: "ไม่พบรหัสอุปกรณ์" });
  if (!/^[0-9a-f-]{36}$/i.test(req.params.postId)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null }, select: { id: true } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const existing = await prisma.like.findUnique({ where: { postId_voterKey: { postId: post.id, voterKey } } });
  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { postId: post.id, voterKey } }).catch(() => {}); // กดซ้อนพร้อมกัน unique จะกันให้
  }
  const likeCount = await prisma.like.count({ where: { postId: post.id } });
  res.json({ liked: !existing, likeCount });
});

module.exports = router;
