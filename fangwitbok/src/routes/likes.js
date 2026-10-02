const express = require("express");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/posts/:postId/like — กดใจ/เอาใจออก (toggle) ป้องกันกดซ้ำด้วย unique constraint ใน DB
router.post("/:postId/like", requireAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const existing = await prisma.like.findUnique({
    where: { postId_userId: { postId: post.id, userId: req.user.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    const count = await prisma.like.count({ where: { postId: post.id } });
    return res.json({ liked: false, likeCount: count });
  }

  await prisma.like.create({ data: { postId: post.id, userId: req.user.id } });
  const count = await prisma.like.count({ where: { postId: post.id } });
  res.json({ liked: true, likeCount: count });
});

module.exports = router;
