const crypto = require("crypto");

const sha256 = (v) => crypto.createHash("sha256").update(String(v)).digest("hex");

function newSecret() {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, hash: sha256(token) };
}

/** เทียบโทเคนที่ client ส่งมากับ hash ใน DB แบบ timing-safe */
function tokenMatches(token, hash) {
  if (!token || !hash || typeof token !== "string" || token.length > 128) return false;
  const a = Buffer.from(sha256(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** hash IP พร้อม secret ของระบบ — ให้ Admin ตรวจสแปมโดยไม่เก็บ IP ดิบ */
function hashIp(ip) {
  return sha256(`${process.env.JWT_ACCESS_SECRET || ""}|${ip || ""}`);
}

/** รหัสอุปกรณ์ผู้เข้าชมสำหรับกดใจ (สุ่มโดยหน้าเว็บ) -> hash */
function voterKeyFrom(req) {
  const raw = req.headers["x-voter-key"];
  if (typeof raw !== "string" || !/^[a-zA-Z0-9-]{16,64}$/.test(raw)) return null;
  return sha256(raw);
}

const isStaff = (user) => !!user && (user.role === "ADMIN" || user.role === "SUPER_ADMIN");

module.exports = { sha256, newSecret, tokenMatches, hashIp, voterKeyFrom, isStaff };
