const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload, MAX_FILES } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");
const { sanitizeText } = require("../utils/sanitize");
const { postLimiter } = require("../middleware/rateLimit");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");
const { publicUrl } = require("../config/storage");
const { hashIp, voterKeyFrom } = require("../utils/guest");

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
    // ปัญหาที่ที่เก็บรูป (เช่น ไม่พบ bucket / key ผิด) ไม่ใช่ความผิดของไฟล์ — แยกข้อความให้ชัด
    if (String(err.message).startsWith("Supabase upload failed")) {
      return res.status(503).json({ error: "ระบบเก็บรูปขัดข้องชั่วคราว กรุณาลองใหม่ หรือแจ้งแอดมิน" });
    }
    return res.status(400).json({ error: "อัปโหลดรูปไม่สำเร็จ ไฟล์อาจเสียหายหรือไม่ใช่รูปภาพ" });
  }

  let post;
  try {
    post = await prisma.post.create({
      data: {
        type,
        isAnonymous,
        authorName: isAnonymous ? null : sanitizeText(authorName),
        authorClass: isAnonymous ? null : sanitizeText(authorClass) || null,
        ipHash: hashIp(req.ip),
        content: sanitizeText(content),
        location: type === "LOST_FOUND" ? sanitizeText(location) || null : null,
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

  // ผู้โพสต์ลบโพสต์เองไม่ได้ (ต้องแจ้งแอดมิน) จึงไม่มีโทเคนเจ้าของโพสต์อีกต่อไป
  res.status(201).json({ post: serializePost(post) });
});

// DELETE /api/posts/:id — เฉพาะทีมงาน (Admin/Super Admin) เท่านั้น ย้ายเข้า Trash 15 วัน
// ผู้เข้าชมทั่วไปลบโพสต์เองไม่ได้ ถ้าต้องการลบให้แจ้งแอดมิน (ตรวจสิทธิ์ที่ Backend ทุกครั้ง)
router.delete("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });
  const post = await prisma.post.findFirst({ where: { id: req.params.id, deletedAt: null } });
  if (!post) return res.status(404).json({ error: "ไม่พบโพสต์นี้" });

  await prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date(), deletedById: req.user.id } });
  await logAudit({ actorId: req.user.id, action: "POST_DELETE", targetType: "POST", targetId: post.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
