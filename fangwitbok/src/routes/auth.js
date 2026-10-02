const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { hashPassword, verifyPassword } = require("../utils/password");
const {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TTL_MS,
} = require("../utils/jwt");
const { validateBody } = require("../utils/validate");
const { authLimiter } = require("../middleware/rateLimit");
const { requireAuth } = require("../middleware/auth");
const { issueCsrfCookie, verifyCsrf } = require("../middleware/csrf");

const router = express.Router();

const REFRESH_COOKIE = "refreshToken";
const cookieOpts = {
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  maxAge: REFRESH_TTL_MS,
  path: "/api/auth", // แนบ cookie นี้เฉพาะ path ของ auth เท่านั้น ลดพื้นผิวการโจมตี
};

// รหัสนักเรียน: ตัวอักษร/ตัวเลข 4-20 ตัว | รหัสผ่าน: อย่างน้อย 8 ตัว มีตัวเลขและตัวอักษร
const registerSchema = z.object({
  studentCode: z.string().trim().min(4).max(20).regex(/^[a-zA-Z0-9._-]+$/, "รหัสนักเรียนมีอักขระไม่ถูกต้อง"),
  password: z.string().min(8).max(72).regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
  displayName: z.string().trim().min(1).max(50),
});

const loginSchema = z.object({
  studentCode: z.string().trim().min(1).max(20),
  password: z.string().min(1).max(72),
});

async function issueSession(res, user, userAgent) {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt, userAgent: userAgent?.slice(0, 200) },
  });

  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts);
  const csrfToken = issueCsrfCookie(res);
  return { accessToken, csrfToken };
}

function publicUser(user) {
  return {
    id: user.id,
    studentCode: user.studentCode,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
  };
}

// POST /api/auth/register
router.post("/register", authLimiter, validateBody(registerSchema), async (req, res) => {
  const { studentCode, password, displayName } = req.body;

  const existing = await prisma.user.findUnique({ where: { studentCode } });
  if (existing) return res.status(409).json({ error: "รหัสนักเรียนนี้ถูกใช้สมัครแล้ว" });

  const passwordHash = await hashPassword(password);
  // ผู้ใช้ใหม่ทุกคนเริ่มที่ role USER เสมอ — role มาจากค่า default ของ schema เท่านั้น
  // ไม่มีทางส่ง role มาจาก body เพราะ registerSchema ไม่มีฟิลด์นี้เลย (ป้องกันการปลอมตัวเป็นแอดมิน)
  const user = await prisma.user.create({
    data: { studentCode, passwordHash, displayName },
  });

  const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);
  res.status(201).json({ user: publicUser(user), accessToken, csrfToken });
});

// POST /api/auth/login
router.post("/login", authLimiter, validateBody(loginSchema), async (req, res) => {
  const { studentCode, password } = req.body;
  const user = await prisma.user.findUnique({ where: { studentCode } });

  // ข้อความ error เหมือนกันทั้งกรณี "ไม่พบบัญชี" และ "รหัสผิด" กันคนสแกนหารหัสนักเรียนที่มีอยู่จริง
  const genericError = () => res.status(401).json({ error: "รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง" });

  if (!user) return genericError();
  if (user.isBanned) return res.status(403).json({ error: "บัญชีนี้ถูกระงับการใช้งาน" });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return genericError();

  const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);
  res.json({ user: publicUser(user), accessToken, csrfToken });
});

// POST /api/auth/refresh — ต้องมี cookie refreshToken + CSRF header ที่ตรงกัน
router.post("/refresh", verifyCsrf, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) return res.status(401).json({ error: "ไม่พบเซสชัน กรุณาเข้าสู่ระบบใหม่" });

  const tokenHash = hashRefreshToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
    return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.isBanned) {
    return res.status(403).json({ error: "บัญชีนี้ใช้งานไม่ได้แล้ว" });
  }

  // หมุนเวียน refresh token ทุกครั้งที่ใช้ (rotation) — ถ้า token เก่าหลุดไปแล้วถูกเอาไปใช้ซ้ำ
  // จะรู้ได้ทันทีเพราะแถวเก่าถูก revoke ไปแล้ว
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  const { accessToken, csrfToken } = await issueSession(res, user, req.headers["user-agent"]);

  res.json({ user: publicUser(user), accessToken, csrfToken });
});

// POST /api/auth/logout
router.post("/logout", verifyCsrf, async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    const tokenHash = hashRefreshToken(token);
    await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revokedAt: new Date() } });
  }
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth" });
  res.clearCookie("csrfToken");
  res.json({ ok: true });
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

module.exports = router;
