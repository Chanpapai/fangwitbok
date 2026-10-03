const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TTL = "15m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 วัน

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  // ล้มเหลวทันทีตอนสตาร์ทเซิร์ฟเวอร์ ดีกว่าไปรันด้วย secret ว่าง/เดาง่ายตอน production
  throw new Error(
    "ต้องตั้งค่า JWT_ACCESS_SECRET และ JWT_REFRESH_SECRET ใน .env ก่อนรันเซิร์ฟเวอร์ (ใช้ค่าสุ่มยาว ๆ เช่น openssl rand -hex 64)"
  );
}

function signAccessToken(user) {
  // เก็บเฉพาะข้อมูลที่จำเป็นใน payload — "role" มาจาก DB ตอน sign เท่านั้น
  // ทุก endpoint ที่ต้องเช็คสิทธิ์จริงจะ query DB ซ้ำอีกที ไม่เชื่อ payload อย่างเดียว (กัน token เก่าที่ role เปลี่ยนไปแล้ว)
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET); // throw ถ้าหมดอายุ/ปลอม
}

function generateRefreshToken() {
  const token = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) };
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TTL_MS,
};
