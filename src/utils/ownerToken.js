const crypto = require("crypto");

// ใช้หลักการเดียวกับ refresh token: สุ่มค่าที่คาดเดาไม่ได้ ส่งคืนให้ "เจ้าของจริง" แค่ครั้งเดียว
// ตอนสร้างโพสต์/คอมเมนต์ แล้วเก็บแค่ "hash" ไว้ในฐานข้อมูล (เหมือนรหัสผ่าน) ไม่เก็บค่าจริง
// ผู้โพสต์ต้องเก็บ token นี้ไว้เอง (ฝั่งหน้าเว็บจะบันทึกลง localStorage ให้อัตโนมัติ) แล้วแนบ
// กลับมาตอนจะแก้ไข/ลบ/เปลี่ยนสถานะภายหลัง เพื่อพิสูจน์ว่าเป็นเจ้าของจริงโดยไม่ต้องมีบัญชี

function generateOwnerToken() {
  const token = crypto.randomBytes(24).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

function hashOwnerToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/** เช็คว่า token ที่ส่งมาตรงกับ hash ที่เก็บไว้ไหม (ใช้ timingSafeEqual กัน timing attack) */
function matchesOwnerToken(token, storedHash) {
  if (!token || !storedHash) return false;
  const candidate = hashOwnerToken(token);
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { generateOwnerToken, hashOwnerToken, matchesOwnerToken };
