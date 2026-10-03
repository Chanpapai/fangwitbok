// ข้อมูลฝั่งเครื่องผู้เข้าชม (ไม่ต้อง Login): รหัสอุปกรณ์กดใจ, โทเคนเจ้าของโพสต์/คอมเมนต์, โทเคนห้องแชท
// ใช้ localStorage ได้ แต่ต้อง try/catch เสมอ (โหมดส่วนตัวอาจใช้ไม่ได้) และมีสำรองในหน่วยความจำ
const mem = {};

function read(key) {
  try { const v = localStorage.getItem(key); return v === null ? mem[key] ?? null : v; } catch { return mem[key] ?? null; }
}
function write(key, value) {
  mem[key] = value;
  try { localStorage.setItem(key, value); } catch { /* ใช้ค่าในหน่วยความจำแทน */ }
}
function remove(key) {
  delete mem[key];
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

function randomId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getVoterKey() {
  let k = read("fwb_voter");
  if (!k) { k = randomId(); write("fwb_voter", k); }
  return k;
}

function ownerMap() {
  try { return JSON.parse(read("fwb_owner") || "{}"); } catch { return {}; }
}
export const getOwnerToken = (kind, id) => ownerMap()[`${kind}:${id}`] || null;
export const hasOwnerToken = (kind, id) => !!getOwnerToken(kind, id);
export function setOwnerToken(kind, id, token) {
  const m = ownerMap();
  m[`${kind}:${id}`] = token;
  write("fwb_owner", JSON.stringify(m));
}
export function dropOwnerToken(kind, id) {
  const m = ownerMap();
  delete m[`${kind}:${id}`];
  write("fwb_owner", JSON.stringify(m));
}

export const getThreadToken = () => read("fwb_thread");
export const setThreadToken = (t) => write("fwb_thread", t);
export const clearThreadToken = () => remove("fwb_thread");

export function getSavedProfile() {
  try { return JSON.parse(read("fwb_profile") || "{}"); } catch { return {}; }
}
export const saveProfile = (name, className) => write("fwb_profile", JSON.stringify({ name, className }));

export const getStaffFlag = () => read("fwb_staff") === "1";
export const setStaffFlag = (on) => (on ? write("fwb_staff", "1") : remove("fwb_staff"));

export const setTheme = (t) => write("fwb_theme", t);
