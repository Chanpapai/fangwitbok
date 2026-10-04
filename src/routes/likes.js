const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { optionalAuth } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");

const router = express.Router();

// POST /api/posts/:postId/like — toggle, ไม่ต้องล็อกอิน (ใช้ x-visitor-id แทน)
router.post("/:postId/like", optionalAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const voterKey = req.user ? `user:${req.user.id}` : req.headers["x-visitor-id"] ? `visitor:${req.headers["x-visitor-id"]}` : null;
  if (!voterKey) return res.status(400).json({ error: "ไม่พบตัวระบุผู้เยี่ยมชม (x-visitor-id)" });

  const existing = await prisma.like.findUnique({ where: { postId_voterKey: { postId: post.id, voterKey } } });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { postId: post.id, voterKey, userId: req.user?.id || null } });
  }
  const count = await prisma.like.count({ where: { postId: post.id } });
  res.json({ liked: !existing, likeCount: count });
});

module.exports = router;
