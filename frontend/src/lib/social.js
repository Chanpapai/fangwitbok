// ตรวจลิงก์โปรไฟล์ Instagram/Facebook ฝั่งหน้าเว็บ (Backend ตรวจซ้ำอีกชั้นเสมอ)
// คืน { url: "" } เมื่อเว้นว่าง · { url, platform } เมื่อผ่าน · { error } เมื่อไม่ผ่าน
const HOSTS = {
  INSTAGRAM: ["instagram.com", "instagr.am"],
  FACEBOOK: ["facebook.com", "fb.com", "fb.me"],
};
export const SOCIAL_LABEL = { INSTAGRAM: "Instagram", FACEBOOK: "Facebook" };

export function parseSocialUrl(input, platforms = ["INSTAGRAM", "FACEBOOK"]) {
  let raw = String(input || "").trim();
  if (!raw) return { url: "" };
  const fail = { error: `ต้องเป็นลิงก์ ${platforms.map((p) => SOCIAL_LABEL[p]).join(" หรือ ")} ที่ถูกต้อง` };
  if (raw.length > 200 || /\s/.test(raw)) return fail;
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return fail; // มี scheme อื่น เช่น javascript:
    raw = `https://${raw}`;
  }
  let u;
  try { u = new URL(raw); } catch { return fail; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return fail;
  if (u.username || u.password) return fail;
  const host = u.hostname.toLowerCase();
  for (const platform of platforms) {
    if (HOSTS[platform]?.some((h) => host === h || host.endsWith(`.${h}`))) {
      u.protocol = "https:";
      return { url: u.href, platform };
    }
  }
  return fail;
}

// ใช้ก่อนใส่ href: คืน URL ที่ปลอดภัย หรือ null
export function safeSocialUrl(input, platforms) {
  const r = parseSocialUrl(input, platforms);
  return r.url || null;
}
