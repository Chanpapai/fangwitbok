// ผู้เยี่ยมชมไม่มีบัญชี — ใช้ 2 อย่างแทนการล็อกอิน:
// 1) visitorId: สุ่มครั้งเดียวเก็บถาวรในเครื่อง ใช้กันกดใจซ้ำ
// 2) ownerToken ต่อโพสต์/คอมเมนต์: backend คืนมาตอนสร้าง เก็บไว้พิสูจน์ว่าเป็นเจ้าของภายหลัง
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getVisitorId() {
  let id = localStorage.getItem("fwb_visitor_id");
  if (!id) {
    id = uuid();
    localStorage.setItem("fwb_visitor_id", id);
  }
  return id;
}

export function saveOwnerToken(kind, id, token) {
  if (!token) return;
  const map = JSON.parse(localStorage.getItem("fwb_owner_tokens") || "{}");
  map[`${kind}:${id}`] = token;
  localStorage.setItem("fwb_owner_tokens", JSON.stringify(map));
}
export function getOwnerToken(kind, id) {
  const map = JSON.parse(localStorage.getItem("fwb_owner_tokens") || "{}");
  return map[`${kind}:${id}`] || null;
}

export function getVisitorToken() {
  return localStorage.getItem("fwb_support_token") || "";
}
export function saveVisitorToken(token) {
  localStorage.setItem("fwb_support_token", token);
}
