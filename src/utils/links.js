// ตรวจลิงก์โซเชียลฝั่ง Backend (ใช้ทั้งช่องทางติดต่อกลับในโพสต์ และช่องทางติดต่อของเว็บ)
// กฎ: https เท่านั้น · โดเมนต้องอยู่ใน allowlist · ห้ามมี user:pass@ หรือพอร์ต · ตัด hash/query ที่ไม่จำเป็นทิ้ง
const DOMAINS = {
  INSTAGRAM: ["instagram.com", "instagr.am"],
  FACEBOOK: ["facebook.com", "fb.com", "fb.me"],
  DISCORD: ["discord.gg", "discord.com", "discordapp.com"],
};
const LABEL = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", DISCORD: "Discord" };

const hostMatches = (host, d) => host === d || host.endsWith(`.${d}`);

/**
 * คืน { empty:true } | { error } | { platform, url }
 * allowed = รายชื่อแพลตฟอร์มที่ยอมรับ เช่น ["INSTAGRAM","FACEBOOK"]
 */
function parseSocialUrl(raw, allowed) {
  let s = String(raw ?? "").trim();
  if (!s) return { empty: true };
  const names = allowed.map((p) => LABEL[p]).join(" หรือ ");
  const bad = { error: `ลิงก์ไม่ถูกต้อง (รองรับเฉพาะลิงก์ ${names})` };
  if (s.length > 300) return { error: "ลิงก์ยาวเกินไป" };
  if (/[\s<>"'`\\]/.test(s)) return bad;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;

  let u;
  try { u = new URL(s); } catch { return bad; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return bad;
  if (u.username || u.password || u.port) return bad;

  const host = u.hostname.toLowerCase();
  const platform = allowed.find((p) => DOMAINS[p].some((d) => hostMatches(host, d)));
  if (!platform) return bad;

  const path = u.pathname.replace(/\/+$/, "");
  if (path.length < 2) return { error: `กรุณาใส่ลิงก์โปรไฟล์/ลิงก์เชิญของ ${LABEL[platform]} ให้ครบ (ไม่ใช่แค่หน้าแรก)` };

  // เก็บ query เฉพาะที่จำเป็น: Facebook profile.php?id=
  let query = "";
  if (platform === "FACEBOOK" && /\/profile\.php$/i.test(path)) {
    const id = u.searchParams.get("id");
    if (!id || !/^\d{5,25}$/.test(id)) return bad;
    query = `?id=${id}`;
  }
  const url = `https://${host}${path}${query}`;
  if (url.length > 200) return { error: "ลิงก์ยาวเกินไป" };
  return { platform, url };
}

module.exports = { parseSocialUrl, LABEL };
