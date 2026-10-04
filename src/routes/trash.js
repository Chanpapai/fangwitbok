const express = require("express");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAudit } = require("../utils/audit");
const { deleteImageFile } = require("../utils/image");

const router = express.Router();
router.use(requireAuth, requireRole("ADMIN"));

const RETENTION_DAYS = 15;

function daysLeft(deletedAt) {
  const purgeAt = new Date(deletedAt).getTime() + RETENTION_DAYS * 86400000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / 86400000));
}

// GET /api/admin/trash — รายการโพสต์/คอมเมนต์ที่ถูกลบ (รอครบ 15 วันแล้วลบถาวรอัตโนมัติ)
router.get("/", async (req, res) => {
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { deletedAt: { not: null } },
      include: { author: { select: { displayName: true, studentCode: true } }, images: true },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.comment.findMany({
      where: { deletedAt: { not: null } },
      include: { author: { select: { displayName: true, studentCode: true } } },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  res.json({
    posts: posts.map((p) => ({ ...p, daysUntilPurge: daysLeft(p.deletedAt) })),
    comments: comments.map((c) => ({ ...c, daysUntilPurge: daysLeft(c.deletedAt) })),
  });
});

// POST /api/admin/trash/posts/:id/restore
router.post("/posts/:id/restore", async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: { not: null } } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ใน Trash" });

  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: null, deletedById: null } });
  await logAudit({
    actorId: req.user.id, action: "POST_RESTORE", targetType: "POST", targetId: post.id, ipAddress: req.ip,
  });
  res.json({ ok: true });
});

// POST /api/admin/trash/comments/:id/restore
router.post("/comments/:id/restore", async (req, res) => {
  const comment = await prisma.comment.findFirst({ where: { id: req.params.id, deletedAt: { not: null } } });
  if (!comment) return res.status(404).json({ error: "ไม่พบคอมเมนต์นี้ใน Trash" });

  await prisma.comment.update({ where: { id: comment.id }, data: { deletedAt: null, deletedById: null } });
  await logAudit({
    actorId: req.user.id, action: "COMMENT_RESTORE", targetType: "COMMENT", targetId: comment.id, ipAddress: req.ip,
  });
  res.json({ ok: true });
});

// DELETE /api/admin/trash/posts/:id — ลบถาวรทันที (ไม่ต้องรอ 15 วัน) เฉพาะ Super Admin
router.delete("/posts/:id", requireRole("SUPER_ADMIN"), async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, deletedAt: { not: null } },
    include: { images: true },
  });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ใน Trash" });

  await Promise.all(post.images.map((img) => deleteImageFile(img.path)));
  await prisma.post.delete({ where: { id: post.id } });

  await logAudit({
    actorId: req.user.id, action: "POST_PURGE", targetType: "POST", targetId: post.id, ipAddress: req.ip,
  });
  res.json({ ok: true });
});

module.exports = router;
