const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { publicUrl } = require("../config/storage");
const { deleteImageFile } = require("../utils/image");
const { normalizeUrl } = require("../utils/social");

const router = express.Router();
const staff = [requireAuth, requireRole("ADMIN")];
const superOnly = [requireAuth, requireRole("SUPER_ADMIN")];

// ค่าเริ่มต้น: ใช้เมื่อ Super Admin ยังไม่เคยแก้ (ไม่ต้องมีแถวในฐานข้อมูลก็ใช้งานได้)
const DEFAULTS = {
  homeHeadline: "ฝากบอกเรื่องราวและตามหาของหายในโรงเรียนฝางวิทยายน",
  postConfirmMessage: "โปรดคิดให้ดีก่อนทำการส่ง เพราะไม่สามารถลบได้ หากต้องการลบให้แจ้งแอดมิน",
};
const SITE_IMAGE_PATH = /^site\/[0-9]+-[a-f0-9]{16}\.webp$/;

// ตัดแท็ก HTML ทิ้ง (กัน XSS) แล้วคืนอักขระ & < > ที่ sanitize-html แปลงไว้ ให้แสดงผลตรงตามที่พิมพ์ (React escape ตอนแสดงให้อยู่แล้ว)
const plain = (s) => sanitizeText(s).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

async function loadSettings() {
  const rows = await prisma.siteSetting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    homeHeadline: map.homeHeadline || DEFAULTS.homeHeadline,
    postConfirmMessage: map.postConfirmMessage || DEFAULTS.postConfirmMessage,
    logoPath: map.logoPath || null,
    profilePath: map.profilePath || null,
  };
}

const serialize = (s) => ({
  homeHeadline: s.homeHeadline,
  postConfirmMessage: s.postConfirmMessage,
  logoPath: s.logoPath,
  profilePath: s.profilePath,
  logoUrl: publicUrl(s.logoPath),
  profileUrl: publicUrl(s.profilePath),
});

// GET /api/settings — สาธารณะ: ข้อความหน้าแรก/ข้อความยืนยันก่อนโพสต์/โลโก้/รูปโปรไฟล์ (cache สั้น ๆ ลด query)
router.get("/settings", async (_req, res) => {
  const [settings, channels] = await Promise.all([
    loadSettings(),
    prisma.contactChannel.findMany({ where: { enabled: true, url: { not: "" } }, select: { key: true, url: true } }),
  ]);
  const s = serialize(settings);
  // ช่องทางติดต่อ: ส่งเฉพาะรายการที่เปิดแสดงและมีลิงก์ (รายการที่ปิดไม่ถูกส่งออกไปเลย)
  const contacts = CONTACT_KEYS.map((c) => channels.find((x) => x.key === c.key)).filter(Boolean);
  res.set("Cache-Control", "public, max-age=10");
  res.json({ homeHeadline: s.homeHeadline, postConfirmMessage: s.postConfirmMessage, logoUrl: s.logoUrl, profileUrl: s.profileUrl, contacts });
});

// ---------------------------------------------------------------------------
// ช่องทางการติดต่อบนหน้าแรก (Instagram / Facebook / Discord) — Admin เปิด/ปิดและตั้งลิงก์เองได้ เก็บใน DB
// ---------------------------------------------------------------------------
const CONTACT_KEYS = [
  { key: "instagram", type: "INSTAGRAM", label: "Instagram" },
  { key: "facebook", type: "FACEBOOK", label: "Facebook" },
  { key: "discord", type: "DISCORD", label: "Discord" },
];

router.get("/admin/contacts", ...staff, async (_req, res) => {
  const rows = await prisma.contactChannel.findMany();
  res.json({
    channels: CONTACT_KEYS.map((c) => {
      const r = rows.find((x) => x.key === c.key);
      return { key: c.key, label: c.label, url: r?.url || "", enabled: r?.enabled || false };
    }),
  });
});

const contactSchema = z.object({ url: z.string().trim().max(200).default(""), enabled: z.boolean() });

router.put("/admin/contacts/:key", ...staff, writeLimiter, validateBody(contactSchema), async (req, res) => {
  const c = CONTACT_KEYS.find((x) => x.key === req.params.key);
  if (!c) return res.status(404).json({ error: "ไม่พบช่องทางนี้" });
  const { url, enabled } = req.body;
  let clean = "";
  if (url) {
    const n = normalizeUrl(url, [c.type]);
    if (!n) return res.status(400).json({ error: `ลิงก์ไม่ถูกต้อง (ต้องเป็นลิงก์ ${c.label} เท่านั้น)` });
    clean = n.url;
  }
  if (enabled && !clean) return res.status(400).json({ error: "กรุณาใส่ลิงก์ก่อนเปิดแสดงผล" });
  const row = await prisma.contactChannel.upsert({
    where: { key: c.key },
    create: { key: c.key, url: clean, enabled, updatedById: req.user.id },
    update: { url: clean, enabled, updatedById: req.user.id },
  });
  await logAudit({
    actorId: req.user.id, action: "CONTACT_UPDATE", targetType: "SETTINGS", targetId: c.key,
    metadata: { enabled }, ipAddress: req.ip,
  });
  res.json({ channel: { key: row.key, label: c.label, url: row.url, enabled: row.enabled } });
});

// GET /api/admin/settings — ค่าปัจจุบันสำหรับหน้าตั้งค่า (มี path ไว้ส่งกลับตอนบันทึก)
router.get("/admin/settings", ...staff, async (_req, res) => {
  res.json({ settings: serialize(await loadSettings()), defaults: DEFAULTS });
});

const imagePathField = z.string().regex(SITE_IMAGE_PATH).nullable().optional();
const settingsSchema = z.object({
  homeHeadline: z.string().trim().min(1, "กรุณากรอกข้อความหน้าแรก").max(200).optional(),
  postConfirmMessage: z.string().trim().min(1, "กรุณากรอกข้อความยืนยัน").max(500).optional(),
  logoPath: imagePathField, // null = กลับไปใช้โลโก้เดิมของระบบ
  profilePath: imagePathField,
});

// PUT /api/admin/settings — เฉพาะ Super Admin
router.put("/admin/settings", ...superOnly, writeLimiter, validateBody(settingsSchema), async (req, res) => {
  const before = await loadSettings();
  const d = req.body;
  const writes = [];
  const upsert = (key, value) =>
    writes.push(
      prisma.siteSetting.upsert({
        where: { key },
        create: { key, value, updatedById: req.user.id },
        update: { value, updatedById: req.user.id },
      })
    );
  const remove = (key) => writes.push(prisma.siteSetting.deleteMany({ where: { key } }));

  if (d.homeHeadline !== undefined) upsert("homeHeadline", plain(d.homeHeadline) || DEFAULTS.homeHeadline);
  if (d.postConfirmMessage !== undefined) upsert("postConfirmMessage", plain(d.postConfirmMessage) || DEFAULTS.postConfirmMessage);
  if (d.logoPath !== undefined) (d.logoPath ? upsert("logoPath", d.logoPath) : remove("logoPath"));
  if (d.profilePath !== undefined) (d.profilePath ? upsert("profilePath", d.profilePath) : remove("profilePath"));

  if (writes.length) await prisma.$transaction(writes);

  // เปลี่ยน/ถอนรูปแล้ว ลบไฟล์เก่าออกจาก Storage เพื่อประหยัดพื้นที่
  if (d.logoPath !== undefined && before.logoPath && before.logoPath !== d.logoPath) await deleteImageFile(before.logoPath);
  if (d.profilePath !== undefined && before.profilePath && before.profilePath !== d.profilePath) await deleteImageFile(before.profilePath);

  await logAudit({
    actorId: req.user.id, action: "SETTINGS_UPDATE", targetType: "SETTINGS", targetId: "site",
    metadata: { changed: Object.keys(d) }, ipAddress: req.ip,
  });
  res.json({ settings: serialize(await loadSettings()) });
});

// GET /api/admin/stats — ตัวเลขสำคัญสำหรับหน้า Dashboard (ดึงครั้งเดียวจบ ไม่ต้องกดหลายขั้นตอน)
router.get("/admin/stats", ...staff, async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [postsTotal, postsToday, pendingReports, supportUnread, trashPosts, activePopups, staffCount] = await Promise.all([
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({ where: { deletedAt: null, createdAt: { gte: startOfDay } } }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.supportThread.count({ where: { unreadForAdmin: { gt: 0 } } }),
    prisma.post.count({ where: { deletedAt: { not: null } } }),
    prisma.popup.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, isBanned: false } }),
  ]);
  res.json({ postsTotal, postsToday, pendingReports, supportUnread, trashPosts, activePopups, staffCount });
});

// ---------------------------------------------------------------------------
// จัดการโพสต์/รูปภาพจากหลังบ้าน (ทีมงานเท่านั้น)
// ---------------------------------------------------------------------------
const who = (p) => (p.isAnonymous ? "ไม่ระบุตัวตน" : p.authorName || p.author?.displayName || "ผู้ใช้ทั่วไป");

// GET /api/admin/posts?type=&q=&page=
router.get("/admin/posts", ...staff, async (req, res) => {
  const page = Math.min(500, Math.max(1, parseInt(req.query.page) || 1));
  const pageSize = 20;
  const q = String(req.query.q || "").trim().slice(0, 100);
  const where = {
    deletedAt: null,
    ...(req.query.type === "ANNOUNCE" || req.query.type === "LOST_FOUND" ? { type: req.query.type } : {}),
    ...(req.query.hasImage === "1" ? { images: { some: {} } } : {}),
    ...(q ? { content: { contains: q, mode: "insensitive" } } : {}),
  };
  const posts = await prisma.post.findMany({
    where,
    include: {
      author: { select: { displayName: true } },
      images: { orderBy: { position: "asc" } },
      _count: { select: { likes: true, comments: { where: { deletedAt: null } }, reports: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.json({
    page,
    hasMore: posts.length > pageSize,
    posts: posts.slice(0, pageSize).map((p) => ({
      id: p.id, type: p.type, content: p.content, location: p.location, createdAt: p.createdAt,
      authorLabel: who(p), authorClass: p.isAnonymous ? null : p.authorClass, isAnonymous: p.isAnonymous,
      likeCount: p._count.likes, commentCount: p._count.comments, reportCount: p._count.reports,
      images: p.images.map((i) => ({ id: i.id, url: publicUrl(i.url) })).filter((i) => i.url),
    })),
  });
});

// GET /api/admin/images?page= — รูปทั้งหมดที่แนบกับโพสต์ (เฉพาะโพสต์ที่ยังไม่ถูกลบ) เรียงจากใหม่ไปเก่า
router.get("/admin/images", ...staff, async (req, res) => {
  const page = Math.min(500, Math.max(1, parseInt(req.query.page) || 1));
  const pageSize = 24;
  const images = await prisma.postImage.findMany({
    where: { post: { deletedAt: null } },
    include: { post: { select: { id: true, createdAt: true, content: true } } },
    orderBy: [{ post: { createdAt: "desc" } }, { position: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize + 1,
  });
  res.json({
    page,
    hasMore: images.length > pageSize,
    images: images.slice(0, pageSize).map((i) => ({
      id: i.id, url: publicUrl(i.url), postId: i.post.id, createdAt: i.post.createdAt, caption: i.post.content.slice(0, 80),
    })).filter((i) => i.url),
  });
});

// GET /api/admin/images/:id/download — ส่งไฟล์รูปเป็นไฟล์ดาวน์โหลดผ่าน Backend
// (ผ่าน Backend เพื่อไม่ติดข้อจำกัด CORS ของ Storage และบันทึก Audit Log ว่าใครโหลดรูปไหน)
router.get("/admin/images/:id/download", ...staff, async (req, res) => {
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: "ไม่พบรูปนี้" });
  const img = await prisma.postImage.findUnique({ where: { id: req.params.id } });
  const url = img && publicUrl(img.url);
  if (!url) return res.status(404).json({ error: "ไม่พบรูปนี้" });

  const upstream = await fetch(url).catch(() => null);
  if (!upstream || !upstream.ok) return res.status(502).json({ error: "ดึงไฟล์รูปจากที่เก็บไม่สำเร็จ" });
  const buf = Buffer.from(await upstream.arrayBuffer());
  const type = upstream.headers.get("content-type") || "image/webp";
  const ext = type.includes("png") ? "png" : type.includes("jpeg") ? "jpg" : "webp";

  await logAudit({ actorId: req.user.id, action: "IMAGE_DOWNLOAD", targetType: "POST", targetId: img.postId, metadata: { imageId: img.id }, ipAddress: req.ip });
  res.set({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="fangwitbok-${img.id.slice(0, 8)}.${ext}"`,
    "Cache-Control": "private, no-store",
  });
  res.send(buf);
});

module.exports = router;
