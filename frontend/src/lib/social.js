// ตรวจลิงก์โซเชียลฝั่งหน้าเว็บ (ให้ผู้ใช้เห็นข้อผิดพลาดทันที) — Backend ตรวจซ้ำด้วยกฎเดียวกันเสมอ
// https เท่านั้น · โดเมนต้องอยู่ใน allowlist · ห้ามมี user:pass@ หรือพอร์ต
const DOMAINS = {
  INSTAGRAM: ["instagram.com", "instagr.am"],
  FACEBOOK: ["facebook.com", "fb.com", "fb.me"],
  DISCORD: ["discord.gg", "discord.com", "discordapp.com"],
};
export const SOCIAL_LABEL = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook", DISCORD: "Discord" };
const hostMatches = (host, d) => host === d || host.endsWith(`.${d}`);

/** คืน { empty:true } | { error } | { platform, url } */
export function parseSocialUrl(raw, allowed) {
  let s = String(raw ?? "").trim();
  if (!s) return { empty: true };
  const bad = { error: `ลิงก์ไม่ถูกต้อง (รองรับเฉพาะลิงก์ ${allowed.map((p) => SOCIAL_LABEL[p]).join(" หรือ ")})` };
  if (s.length > 300 || /[\s<>"'`\\]/.test(s)) return bad;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) s = `https://${s.replace(/^\/+/, "")}`;
  let u;
  try { u = new URL(s); } catch { return bad; }
  if ((u.protocol !== "https:" && u.protocol !== "http:") || u.username || u.password || u.port) return bad;
  const host = u.hostname.toLowerCase();
  const platform = allowed.find((p) => DOMAINS[p].some((d) => hostMatches(host, d)));
  if (!platform) return bad;
  const path = u.pathname.replace(/\/+$/, "");
  if (path.length < 2) return { error: `กรุณาใส่ลิงก์โปรไฟล์/ลิงก์เชิญของ ${SOCIAL_LABEL[platform]} ให้ครบ (ไม่ใช่แค่หน้าแรก)` };
  let query = "";
  if (platform === "FACEBOOK" && /\/profile\.php$/i.test(path)) {
    const id = u.searchParams.get("id");
    if (!id || !/^\d{5,25}$/.test(id)) return bad;
    query = `?id=${id}`;
  }
  return { platform, url: `https://${host}${path}${query}` };
}

/** ใช้ก่อนแสดงเป็นลิงก์: คืน url ที่ปลอดภัย หรือ null (กันค่าแปลกปลอมในฐานข้อมูล) */
export const safeSocialUrl = (url, allowed) => parseSocialUrl(url, allowed).url || null;
