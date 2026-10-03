const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { optionalAuth } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { commentLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { newSecret, tokenMatches, hashIp, isStaff } = require("../utils/guest");

const router = express.Router();

const createCommentSchema = z
  .object({
    content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(500),
    isAnonymous: z.boolean().default(false),
    authorName: z.string().trim().max(60).optional().default(""),
    authorClass: z.string().trim().max(30).optional().default(""),
    website: z.string().max(0).optional(), // honeypot
  })
  .superRefine((v, ctx) => {
    if (!v.isAnonymous && !v.authorName) {
      ctx.addIssue({ code: "custom", path: ["authorName"], message: "กรุณากรอกชื่อ หรือเลือกไม่ระบุตัวตน" });
    }
  });

// POST /api/posts/:postId/comments
router.post("/posts/:postId/comments", commentLimiter, validateBody(createCommentSchema), async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.postId)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  const post = await prisma.post.findFirst({ where: { id: req.params.postId, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const { content, isAnonymous, authorName, authorClass } = req.body;
  const owner = newSecret();
  const c = await prisma.comment.create({
    data: {
      postId: post.id,
      isAnonymous,
      authorName: isAnonymous ? null : sanitizeText(authorName),
      authorClass: isAnonymous ? null : sanitizeText(authorClass) || null,
      ownerTokenHash: owner.hash,
      ipHash: hashIp(req.ip),
      content: sanitizeText(content),
    },
  });

  res.status(201).json({
    comment: {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: isAnonymous
        ? { name: "ไม่ระบุตัวตน", className: null, anonymous: true }
        : { name: c.authorName, className: c.authorClass, anonymous: false },
    },
    ownerToken: owner.token,
  });
});

// DELETE /api/comments/:id — เจ้าของคอมเมนต์ (โทเคน) หรือ Admin
router.delete("/comments/:id", optionalAuth, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: "ไม่พบคอมเมนต์นี้" });
  const comment = await prisma.comment.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!comment) return res.status(404).json({ error: "ไม่พบคอมเมนต์นี้" });

  const owner = tokenMatches(req.headers["x-owner-token"], comment.ownerTokenHash);
  const staff = isStaff(req.user);
  if (!owner && !staff) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบคอมเมนต์นี้" });

  await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date(), deletedById: req.user?.id ?? null } });
  if (staff && !owner) {
    await logAudit({
      actorId: req.user.id, action: "COMMENT_DELETE", targetType: "COMMENT", targetId: comment.id,
      metadata: { postId: comment.postId }, ipAddress: req.ip,
    });
  }
  res.json({ ok: true });
});

module.exports = router;
