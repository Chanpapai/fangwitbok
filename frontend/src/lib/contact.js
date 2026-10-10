// ตรวจลิงก์ช่องทางติดต่อฝั่งหน้าเว็บ (Backend ตรวจซ้ำเสมอ — อันนี้เพื่อแจ้งผู้ใช้ทันที)
const HOSTS = { INSTAGRAM: ["instagram.com", "instagr.am"], FACEBOOK: ["facebook.com", "fb.com", "fb.me"] };

export function parseSocialUrl(input) {
  let raw = String(input || "").trim();
  if (!raw || raw.length > 200 || /\s/.test(raw)) return null;
  if (!/^https?:\/\//i.test(raw)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null;
    raw = `https://${raw}`;
  }
  let u;
  try { u = new URL(raw); } catch { return null; }
  if (u.username || u.password) return null;
  const host = u.hostname.toLowerCase();
  for (const [type, list] of Object.entries(HOSTS)) {
    if (list.some((h) => host === h || host.endsWith(`.${h}`))) return { url: u.href, type };
  }
  return null;
}
