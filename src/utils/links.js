// ตรวจลิงก์โปรไฟล์ Instagram/Facebook ที่ผู้ใช้กรอกเอง (ใช้ตัวตรวจเดียวกับช่องทางติดต่อกลับในโพสต์)
// คืน { url: "" } เมื่อเว้นว่าง · { url } เมื่อผ่าน · { error } เมื่อไม่ผ่าน
const { normalizeUrl } = require("./social");

const NAME = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook" };

function parseSocialUrl(input, types) {
  const raw = String(input || "").trim();
  if (!raw) return { url: "" };
  const r = normalizeUrl(raw, types);
  if (!r) return { error: `ต้องเป็นลิงก์ ${types.map((t) => NAME[t] || t).join(" หรือ ")} ที่ถูกต้อง` };
  return { url: r.url, platform: r.type };
}

module.exports = { parseSocialUrl };
