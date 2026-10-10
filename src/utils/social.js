// ตรวจ/ทำความสะอาด URL ช่องทางติดต่อ (กัน javascript:, data:, โดเมนปลอม, ใส่ user:pass@ ฯลฯ)
// คืน { url, type } เมื่อผ่าน หรือ null เมื่อไม่ผ่าน
const HOSTS = {
  INSTAGRAM: ["instagram.com", "instagr.am"],
  FACEBOOK: ["facebook.com", "fb.com", "fb.me"],
  DISCORD: ["discord.gg", "discord.com", "discordapp.com"],
};

function normalizeUrl(input, types) {
  let raw = String(input || "").trim();
  if (!raw || raw.length > 200 || /\s/.test(raw)) return null;
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null; // มี scheme อื่น เช่น javascript:
    raw = `https://${raw}`;
  }
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  for (const type of types) {
    if (HOSTS[type].some((h) => host === h || host.endsWith(`.${h}`))) {
      u.protocol = "https:";
      return { url: u.href, type };
    }
  }
  return null;
}

module.exports = { normalizeUrl };
