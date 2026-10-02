const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole, optionalAuth } = require("../middleware/auth");
const { upload, MAX_FILES } = require("../middleware/upload");
const { processAndSaveImages } = require("../utils/image");
const { sanitizeText } = require("../utils/sanitize");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");

const router = express.Router();

const createPostSchema = z.object({
  type: z.enum(["ANNOUNCE", "LOST_FOUND"]),
  content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(2000),
  isAnonymous: z.coerce.boolean().default(false),
  location: z.string().trim().max(200).optional().or(z.literal("")),
});

function displayAuthor(post, viewer) {
  // ผู้โพสต์เห็นชื่อตัวเองเสมอ / Admin เห็นชื่อจริงเสมอ (จำเป็นต่อการตรวจสอบ) / คนอื่นเห็นตามที่เลือกไว้
  const canSeeReal =
    !post.isAnonymous ||
    (viewer && (viewer.id === post.authorId || viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN"));
  return canSeeReal
    ? { displayName: post.author.displayName, avatarUrl: post.author.avatarUrl, isAnonymous: post.isAnonymous }
    : { displayName: "ไม่ระบุชื่อ", avatarUrl: null, isAnonymous: true };
}

function serializePost(post, viewer) {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    lostStatus: post.lostStatus,
    location: post.location,
    createdAt: post.createdAt,
    images: post.images.map((i) => i.url),
    likeCount: post._count?.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    likedByMe: viewer ? post.likes?.some((l) => l.userId === viewer.id) : false,
    author: displayAuthor(post, viewer),
    isMine: viewer ? viewer.id === post.authorId : false,
  };
}

const postInclude = (viewerId) => ({
  author: true,
  images: { orderBy: { position: "asc" } },
  _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
  likes: viewerId ? { where: { userId: viewerId }, select: { userId: true } } : false,
});

// GET /api/posts?type=ANNOUNCE|LOST_FOUND&page=1 — Feed สาธารณะ (ดูได้โดยไม่ต้องล็อกอิน)
router.get("/", optionalAuth, async (req, res) => {
  const { type } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 15;

  const where = { deletedAt: null, ...(type === "ANNOUNCE" || type === "LOST_FOUND" ? { type } : {}) };

  const posts = await prisma.post.findMany({
    where,
    include: postInclude(req.user?.id),
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  res.json({ posts: posts.map((p) => serializePost(p, req.user)), page });
});

// GET /api/posts/:id — รายละเอียดโพสต์ + คอมเมนต์
router.get("/:id", optionalAuth, async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: postInclude(req.user?.id),
  });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const comments = await prisma.comment.findMany({
    where: { postId: post.id, deletedAt: null },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  const canSeeRealName = (c) =>
    !c.isAnonymous ||
    (req.user && (req.user.id === c.authorId || req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN"));

  res.json({
    post: serializePost(post, req.user),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      isMine: req.user ? req.user.id === c.authorId : false,
      author: canSeeRealName(c)
        ? { displayName: c.author.displayName, avatarUrl: c.author.avatarUrl }
        : { displayName: "ไม่ระบุชื่อ", avatarUrl: null },
    })),
  });
});

// POST /api/posts — สร้างโพสต์ใหม่ (แนบรูปได้สูงสุด 5 รูป ไม่บังคับ)
router.post("/", requireAuth, writeLimiter, upload.array("images", MAX_FILES), async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors });
  }
  const { type, content, isAnonymous, location } = parsed.data;

  let imageUrls = [];
  try {
    if (req.files?.length) imageUrls = await processAndSaveImages(req.files);
  } catch (err) {
    console.error("[posts] ประมวลผลรูปไม่สำเร็จ:", err.message);
    return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้องหรือเสียหาย กรุณาลองรูปอื่น" });
  }

  const post = await prisma.post.create({
    data: {
      type,
      authorId: req.user.id,
      isAnonymous,
      content: sanitizeText(content),
      location: type === "LOST_FOUND" ? sanitizeText(location || "") || null : null,
      lostStatus: type === "LOST_FOUND" ? "NOT_FOUND" : null,
      images: { create: imageUrls.map((url, i) => ({ url, position: i })) },
    },
    include: postInclude(req.user.id),
  });

  notifyAdmins({
    type: "NEW_POST",
    title: type === "LOST_FOUND" ? "มีประกาศตามหาของหายใหม่" : "มีฝากบอกใหม่",
    body: content.slice(0, 100),
    relatedType: "POST",
    relatedId: post.id,
  }).catch((e) => console.error("[notify] ล้มเหลว:", e.message));

  res.status(201).json({ post: serializePost(post, req.user) });
});

// PATCH /api/posts/:id/lost-status — สลับสถานะ "ยังไม่เจอ" <-> "เจอของแล้ว" (เจ้าของโพสต์หรือ Admin)
router.patch("/:id/lost-status", requireAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  if (post.type !== "LOST_FOUND") return res.status(400).json({ error: "ใช้ได้เฉพาะโพสต์ตามหาของหาย" });

  const isOwner = post.authorId === req.user.id;
  const isStaff = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!isOwner && !isStaff) return res.status(403).json({ error: "ไม่มีสิทธิ์แก้ไขโพสต์นี้" });

  const next = post.lostStatus === "FOUND" ? "NOT_FOUND" : "FOUND";
  const updated = await prisma.post.update({ where: { id: post.id }, data: { lostStatus: next } });
  res.json({ lostStatus: updated.lostStatus });
});

// DELETE /api/posts/:id — Soft delete (ย้ายเข้า Trash) เจ้าของโพสต์หรือ Admin/Super Admin
router.delete("/:id", requireAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const isOwner = post.authorId === req.user.id;
  const isStaff = req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN";
  if (!isOwner && !isStaff) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบโพสต์นี้" });

  await prisma.post.update({
    where: { id: post.id },
    data: { deletedAt: new Date(), deletedById: req.user.id },
  });

  if (isStaff && !isOwner) {
    await logAudit({
      actorId: req.user.id,
      action: "POST_DELETE",
      targetType: "POST",
      targetId: post.id,
      metadata: { authorId: post.authorId },
      ipAddress: req.ip,
    });
  }
  res.json({ ok: true });
});

module.exports = router;
