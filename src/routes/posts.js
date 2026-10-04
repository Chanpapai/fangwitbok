const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { optionalAuth } = require("../middleware/auth");
const { upload, MAX_FILES } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");
const { sanitizeText } = require("../utils/sanitize");
const { writeLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");
const { generateOwnerToken, matchesOwnerToken } = require("../utils/ownerToken");

const router = express.Router();

const createPostSchema = z.object({
  type: z.enum(["ANNOUNCE", "LOST_FOUND"]),
  content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(2000),
  isAnonymous: z.coerce.boolean().default(false),
  guestName: z.string().trim().max(50).optional().or(z.literal("")),
  guestClassroom: z.string().trim().max(50).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
});

function displayAuthor(post, viewer) {
  const isStaff = viewer && (viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN");
  if (post.isAnonymous && !isStaff) return { displayName: "ไม่ระบุตัวตน", isAnonymous: true };
  if (post.isAnonymous) return { displayName: "ไม่ระบุตัวตน", isAnonymous: true, _staffNote: post.guestName || post.author?.displayName };
  const name = post.author?.displayName || post.guestName || "ไม่ระบุตัวตน";
  const sub = post.guestClassroom ? ` (${post.guestClassroom})` : "";
  return { displayName: name + sub, isAnonymous: false };
}

function serializePost(post, viewer, ownerToken) {
  const isOwnerByToken = ownerToken && matchesOwnerToken(ownerToken, post.ownerTokenHash);
  const isStaff = viewer && (viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN");
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
    likedByMe: post.likes?.length > 0,
    author: displayAuthor(post, viewer),
    canManage: !!isOwnerByToken || !!isStaff,
    hasOwnerToken: !!post.ownerTokenHash,
  };
}

const postInclude = (voterKey) => ({
  author: true,
  images: { orderBy: { position: "asc" } },
  _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
  likes: voterKey ? { where: { voterKey }, select: { id: true } } : false,
});

function getVoterKey(req) {
  if (req.user) return `user:${req.user.id}`;
  const v = req.headers["x-visitor-id"];
  return v ? `visitor:${v}` : null;
}
function getOwnerToken(req) {
  return req.headers["x-owner-token"] || req.body?.ownerToken || null;
}

// GET /api/posts?type=&page=
router.get("/", optionalAuth, async (req, res) => {
  const { type } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 15;
  const where = { deletedAt: null, ...(type === "ANNOUNCE" || type === "LOST_FOUND" ? { type } : {}) };
  const voterKey = getVoterKey(req);

  const posts = await prisma.post.findMany({
    where,
    include: postInclude(voterKey),
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  res.json({ posts: posts.map((p) => serializePost(p, req.user, getOwnerToken(req))), page });
});

// GET /api/posts/:id
router.get("/:id", optionalAuth, async (req, res) => {
  const voterKey = getVoterKey(req);
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null }, include: postInclude(voterKey) });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const comments = await prisma.comment.findMany({
    where: { postId: post.id, deletedAt: null },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });
  const ownerToken = getOwnerToken(req);
  const isStaff = req.user && (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN");

  res.json({
    post: serializePost(post, req.user, ownerToken),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      canManage: !!isStaff || matchesOwnerToken(ownerToken, c.ownerTokenHash),
      author: c.isAnonymous && !isStaff ? "ไม่ระบุตัวตน" : c.author?.displayName || c.guestName || "ไม่ระบุตัวตน",
    })),
  });
});

// POST /api/posts — ไม่ต้องล็อกอิน แนบรูปได้สูงสุด 5 รูป
router.post("/", optionalAuth, writeLimiter, upload.array("images", MAX_FILES), async (req, res) => {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors });
  const { type, content, isAnonymous, guestName, guestClassroom, location } = parsed.data;

  let images = [];
  try {
    if (req.files?.length) images = await processAndSaveImages(req.files, "posts");
  } catch (err) {
    console.error("[posts] รูปไม่ถูกต้อง:", err.message);
    return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้องหรือเสียหาย กรุณาลองรูปอื่น" });
  }

  const { token, tokenHash } = generateOwnerToken();
  const post = await prisma.post.create({
    data: {
      type,
      isAnonymous,
      authorId: req.user?.id || null,
      guestName: !isAnonymous && !req.user ? sanitizeText(guestName || "") || null : null,
      guestClassroom: !isAnonymous && !req.user ? sanitizeText(guestClassroom || "") || null : null,
      ownerTokenHash: req.user ? null : tokenHash,
      content: sanitizeText(content),
      location: type === "LOST_FOUND" ? sanitizeText(location || "") || null : null,
      lostStatus: type === "LOST_FOUND" ? "NOT_FOUND" : null,
      images: { create: images.map((img, i) => ({ url: img.url, path: img.path, position: i })) },
    },
    include: postInclude(null),
  });

  notifyAdmins({
    type: "NEW_POST",
    title: type === "LOST_FOUND" ? "มีประกาศตามหาของหายใหม่" : "มีฝากบอกใหม่",
    body: content.slice(0, 100),
    relatedType: "POST",
    relatedId: post.id,
  }).catch((e) => console.error("[notify]", e.message));

  res.status(201).json({ post: serializePost(post, req.user, null), ownerToken: req.user ? null : token });
});

function canModify(post, req) {
  const isStaff = req.user && (req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN");
  const isAuthor = req.user && post.authorId === req.user.id;
  const isOwnerByToken = matchesOwnerToken(getOwnerToken(req), post.ownerTokenHash);
  return { ok: isStaff || isAuthor || isOwnerByToken, isStaff, isAuthor };
}

// PATCH /api/posts/:id/lost-status — เจ้าของโพสต์จริง (ตรวจจาก ownerToken/บัญชี) หรือแอดมินเท่านั้น
router.patch("/:id/lost-status", optionalAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  if (post.type !== "LOST_FOUND") return res.status(400).json({ error: "ใช้ได้เฉพาะโพสต์ตามหาของหาย" });

  const { ok } = canModify(post, req);
  if (!ok) return res.status(403).json({ error: "ไม่มีสิทธิ์แก้ไขโพสต์นี้ (ต้องเป็นเจ้าของโพสต์)" });

  const next = post.lostStatus === "FOUND" ? "NOT_FOUND" : "FOUND";
  const updated = await prisma.post.update({ where: { id: post.id }, data: { lostStatus: next } });
  res.json({ lostStatus: updated.lostStatus });
});

// DELETE /api/posts/:id — soft delete
router.delete("/:id", optionalAuth, async (req, res) => {
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const { ok, isStaff, isAuthor } = canModify(post, req);
  if (!ok) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบโพสต์นี้" });

  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date(), deletedById: req.user?.id || null } });

  if (isStaff && !isAuthor) {
    await logAudit({ actorId: req.user.id, action: "POST_DELETE", targetType: "POST", targetId: post.id, ipAddress: req.ip });
  }
  res.json({ ok: true });
});

module.exports = router;
