const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { optionalAuth } = require("../middleware/auth");
const { upload, MAX_FILES } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");
const { sanitizeText } = require("../utils/sanitize");
const { postLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");
const { publicUrl } = require("../config/storage");
const { newSecret, tokenMatches, hashIp, voterKeyFrom, isStaff } = require("../utils/guest");

const router = express.Router();
const UUID = /^[0-9a-f-]{36}$/i;

const bool = z.preprocess((v) => v === true || v === "true" || v === "1", z.boolean());

const createPostSchema = z
  .object({
    type: z.enum(["ANNOUNCE", "LOST_FOUND"]),
    content: z.string().trim().min(1, "กรุณากรอกข้อความ").max(2000),
    isAnonymous: bool.default(false),
    authorName: z.string().trim().max(60).optional().default(""),
    authorClass: z.string().trim().max(30).optional().default(""),
    location: z.string().trim().max(200).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (!v.isAnonymous && !v.authorName) {
      ctx.addIssue({ code: "custom", path: ["authorName"], message: "กรุณากรอกชื่อ หรือเลือกไม่ระบุตัวตน" });
    }
  });

/** โหมดไม่ระบุตัวตนไม่เก็บชื่อ/ชั้นในระบบเลย จึงไม่มีอะไรให้หลุดสู่สาธารณะ */
function serializeAuthor(post) {
  if (post.isAnonymous) return { name: "ไม่ระบุตัวตน", className: null, anonymous: true };
  return {
    name: post.authorName || post.author?.displayName || "ผู้ใช้ทั่วไป",
    className: post.authorClass || null,
    anonymous: false,
  };
}

function serializePost(post) {
  return {
    id: post.id,
    type: post.type,
    content: post.content,
    lostStatus: post.lostStatus,
    location: post.location,
    createdAt: post.createdAt,
    images: post.images.map((i) => ({ url: publicUrl(i.url), width: i.width, height: i.height })).filter((i) => i.url),
    likeCount: post._count?.likes ?? 0,
    commentCount: post._count?.comments ?? 0,
    likedByMe: Array.isArray(post.likes) ? post.likes.length > 0 : false,
    author: serializeAuthor(post),
  };
}

const postInclude = (voterHash) => ({
  author: { select: { displayName: true } },
  images: { orderBy: { position: "asc" } },
  _count: { select: { likes: true, comments: { where: { deletedAt: null } } } },
  likes: voterHash ? { where: { voterKey: voterHash }, select: { id: true } } : false,
});

/** เจ้าของโพสต์จริง = ถือโทเคนที่ตรงกับ hash ใน DB (ตรวจที่ Backend เสมอ) */
const isOwner = (req, post) => tokenMatches(req.headers["x-owner-token"], post.ownerTokenHash);

// GET /api/posts?type=&page=
router.get("/", async (req, res) => {
  const { type } = req.query;
  const page = Math.min(200, Math.max(1, parseInt(req.query.page) || 1));
  const pageSize = 12;
  const where = { deletedAt: null, ...(type === "ANNOUNCE" || type === "LOST_FOUND" ? { type } : {}) };

  const posts = await prisma.post.findMany({
    where,
    include: postInclude(voterKeyFrom(req)),
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize + 1, // ดึงเกิน 1 แถวเพื่อรู้ว่ามีหน้าถัดไปไหม ไม่ต้อง count แยก (ประหยัด query)
  });
  res.json({ posts: posts.slice(0, pageSize).map(serializePost), page, hasMore: posts.length > pageSize });
});

// GET /api/posts/:id
router.get("/:id", async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  const post = await prisma.post.findFirst({
    where: { id: req.params.id, deletedAt: null },
    include: postInclude(voterKeyFrom(req)),
  });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้ (อาจถูกลบไปแล้ว)" });

  const comments = await prisma.comment.findMany({
    where: { postId: post.id, deletedAt: null },
    include: { author: { select: { displayName: true } } },
    orderBy: { createdAt: "asc" },
    take: 300,
  });

  res.json({
    post: serializePost(post),
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      author: c.isAnonymous
        ? { name: "ไม่ระบุตัวตน", className: null, anonymous: true }
        : { name: c.authorName || c.author?.displayName || "ผู้ใช้ทั่วไป", className: c.authorClass || null, anonymous: false },
    })),
  });
});

// POST /api/posts — ผู้เข้าชมทั่วไปโพสต์ได้เลย ไม่ต้อง Login
router.post("/", postLimiter, upload.array("images", MAX_FILES), async (req, res) => {
  if (req.body.website) return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" }); // honeypot กันบอท

  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง", details: parsed.error.flatten().fieldErrors });
  }
  const { type, content, isAnonymous, authorName, authorClass, location } = parsed.data;

  let images = [];
  try {
    if (req.files?.length) images = await processAndSaveImages(req.files, "posts");
  } catch (err) {
    console.error("[posts] อัปโหลดรูปไม่สำเร็จ:", err.message);
    if (err.code === "STORAGE_NOT_CONFIGURED") {
      return res.status(503).json({ error: "ระบบเก็บรูปยังไม่พร้อมใช้งาน กรุณาแจ้งผู้ดูแล" });
    }
    return res.status(400).json({ error: "อัปโหลดรูปไม่สำเร็จ ไฟล์อาจเสียหายหรือไม่ใช่รูปภาพ" });
  }

  const owner = newSecret();
  let post;
  try {
    post = await prisma.post.create({
      data: {
        type,
        isAnonymous,
        authorName: isAnonymous ? null : sanitizeText(authorName),
        authorClass: isAnonymous ? null : sanitizeText(authorClass) || null,
        ownerTokenHash: owner.hash,
        ipHash: hashIp(req.ip),
        content: sanitizeText(content),
        location: type === "LOST_FOUND" ? sanitizeText(location) || null : null,
        lostStatus: type === "LOST_FOUND" ? "NOT_FOUND" : null,
        images: { create: images.map((im, i) => ({ url: im.path, width: im.width, height: im.height, position: i })) },
      },
      include: postInclude(null),
    });
  } catch (err) {
    await Promise.all(images.map((im) => deleteImageFile(im.path)));
    throw err;
  }

  notifyAdmins({
    type: "NEW_POST",
    title: type === "LOST_FOUND" ? "มีประกาศตามหาของหายใหม่" : "มีฝากบอกใหม่",
    body: post.content.slice(0, 100),
    relatedType: "POST",
    relatedId: post.id,
  }).catch((e) => console.error("[notify]", e.message));

  // ownerToken ส่งกลับครั้งเดียวตอนสร้าง เก็บที่เครื่องผู้โพสต์ — ใน DB มีแค่ hash
  res.status(201).json({ post: serializePost(post), ownerToken: owner.token });
});

// PATCH /api/posts/:id/lost-status — เฉพาะ "เจ้าของโพสต์" (ตรวจโทเคนที่ Backend) ไม่รวม Admin
router.patch("/:id/lost-status", optionalAuth, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  if (post.type !== "LOST_FOUND") return res.status(400).json({ error: "ใช้ได้เฉพาะโพสต์ตามหาของหาย" });

  const legacyOwner = !!req.user && !!post.authorId && post.authorId === req.user.id;
  if (!isOwner(req, post) && !legacyOwner) {
    return res.status(403).json({ error: "เฉพาะเจ้าของโพสต์เท่านั้นที่เปลี่ยนสถานะได้" });
  }

  const wanted = req.body?.status;
  const next = wanted === "FOUND" || wanted === "NOT_FOUND" ? wanted : post.lostStatus === "FOUND" ? "NOT_FOUND" : "FOUND";
  const updated = await prisma.post.update({ where: { id: post.id }, data: { lostStatus: next } });
  res.json({ lostStatus: updated.lostStatus });
});

// DELETE /api/posts/:id — เจ้าของโพสต์ หรือ Admin (ย้ายเข้า Trash 15 วัน)
router.delete("/:id", optionalAuth, async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  const owner = isOwner(req, post) || (!!req.user && post.authorId === req.user.id);
  const staff = isStaff(req.user);
  if (!owner && !staff) return res.status(403).json({ error: "ไม่มีสิทธิ์ลบโพสต์นี้" });

  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date(), deletedById: req.user?.id ?? null } });
  if (staff && !owner) {
    await logAudit({ actorId: req.user.id, action: "POST_DELETE", targetType: "POST", targetId: post.id, ipAddress: req.ip });
  }
  res.json({ ok: true });
});

module.exports = router;
