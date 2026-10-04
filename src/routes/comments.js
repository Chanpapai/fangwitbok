const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { optionalAuth } = require("../middleware/auth");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { generateOwnerToken, matchesOwnerToken } = require("../utils/ownerToken");

const router = express.Router();

const createCommentSchema = z.object({
  content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(500),
  isAnonymous: z.coerce.boolean().default(false),
  guestName: z.string().trim().max(50).optional().or(z.literal("")),
});

function getOwnerToken(req) {
  return req.headers["x-owner-token"] || req.body?.ownerToken || null;
}

// POST /api/posts/:postId/comments — ไม่ต้องล็อกอิน
router.post("/:postId/comments", optionalAuth, writeLimiter, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors });
  const { content, isAnonymous, guestName } = parsed.data;

  const { token, tokenHash } = generateOwnerToken();
  const comment = await prisma.comment.create({
    data: {
      postId: post.id,
      isAnonymous,
      authorId: req.user?.id || null,
      guestName: !isAnonymous && !req.user ? sanitizeText(guestName || "") || null : null,
      ownerTokenHash: req.user ? null : tokenHash,
      content: sanitizeText(content),
    },
    include: { author: true },
  });

  res.status(201).json({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      canManage: true,
      author: comment.isAnonymous ? "ไม่ระบุตัวตน" : comment.author?.displayName || comment.guestName || "ไม่ระบุตัวตน",
    },
    ownerToken: req.user ? null : token,
  });
});

// DELETE /api/comments/:id — เจ้าของจริง (ownerToken/บัญชี) หรือแอดมิน
router.delete("/comments/:id", optionalAuth, async (req, res) => {
  const comment = await prisma.comment.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!comment) return res.status(404).json({ error: "ไม่พบคอมเมนต์นี้" });

  const isStaff = req.user && (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN");
  const isAuthor = req.user && comment.authorId === req.user.id;
  const isOwnerByToken = matchesOwnerToken(getOwnerToken(req), comment.ownerTokenHash);
  if (!isStaff && !isAuthor && !isOwnerByToken) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบคอมเมนต์นี้" });

  await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date(), deletedById: req.user?.id || null } });

  if (isStaff && !isAuthor) {
    await logAudit({ actorId: req.user.id, action: "COMMENT_DELETE", targetType: "COMMENT", targetId: comment.id, ipAddress: req.ip });
  }
  res.json({ ok: true });
});

module.exports = router;
