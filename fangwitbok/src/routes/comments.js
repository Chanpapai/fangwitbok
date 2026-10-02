const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");

const router = express.Router();

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(500),
  isAnonymous: z.coerce.boolean().default(false),
});

// POST /api/posts/:postId/comments
router.post("/:postId/comments", requireAuth, writeLimiter, validateBody(createCommentSchema), async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      authorId: req.user.id,
      isAnonymous: req.body.isAnonymous,
      content: sanitizeText(req.body.content),
    },
    include: { author: true },
  });

  res.status(201).json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      isMine: true,
      author: comment.isAnonymous
        ? { displayName: "ไม่ระบุชื่อ", avatarUrl: null }
        : { displayName: comment.author.displayName, avatarUrl: comment.author.avatarUrl },
    },
  });
});

// DELETE /api/comments/:id — เจ้าของคอมเมนต์หรือ Admin/Super Admin
router.delete("/comments/:id", requireAuth, async (req, res) => {
  const comment = await prisma.comment.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!comment) return res.status(404).json({ error: "ไม่พบคอมเมนต์นี้" });

  const isOwner = comment.authorId === req.user.id;
  const isStaff = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!isOwner && !isStaff) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบคอมเมนต์นี้" });

  await prisma.comment.update({
    where: { id: comment.id },
    data: { deletedAt: new Date(), deletedById: req.user.id },
  });

  if (isStaff && !isOwner) {
    await logAudit({
      actorId: req.user.id,
      action: "COMMENT_DELETE",
      targetType: "COMMENT",
      targetId: comment.id,
      metadata: { authorId: comment.authorId, postId: comment.postId },
      ipAddress: req.ip,
    });
  }
  res.json({ ok: true });
});

module.exports = router;
