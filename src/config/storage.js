// ที่เก็บรูปถาวร: Supabase Storage (เรียก REST API ด้วย fetch ของ Node ไม่ต้องพึ่งแพ็กเกจเพิ่ม)
// - SERVICE ROLE KEY อยู่ฝั่ง Backend เท่านั้น (ห้ามส่งไปหน้าเว็บ)
// - bucket เป็น Public: เปิดรูปได้ตรงจาก URL แต่ "เขียน/ลบ" ได้เฉพาะผ่าน Backend นี้
const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BUCKET = process.env.SUPABASE_BUCKET || "fangwitbok";

const isConfigured = () => Boolean(SUPABASE_URL && SERVICE_KEY);
// รองรับทั้งคีย์เก่า (service_role, เป็น JWT ขึ้นต้น eyJ) และคีย์ใหม่ (sb_secret_..., ไม่ใช่ JWT → ส่งเฉพาะ header apikey)
const authHeaders = (extra = {}) => ({
  apikey: SERVICE_KEY,
  ...(SERVICE_KEY.startsWith("eyJ") ? { Authorization: `Bearer ${SERVICE_KEY}` } : {}),
  ...extra,
});

async function uploadObject(objectPath, buffer, contentType) {
  if (!isConfigured()) {
    const err = new Error("STORAGE_NOT_CONFIGURED");
    err.code = "STORAGE_NOT_CONFIGURED";
    throw err;
  }
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable", // ชื่อไฟล์สุ่มไม่ซ้ำ จึง cache ยาวได้ ประหยัด Egress
      "x-upsert": "false",
    }),
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase upload failed (${res.status}): ${text.slice(0, 200)}`);
  }
}

async function deleteObjects(paths) {
  const list = paths.filter(Boolean);
  if (!list.length || !isConfigured()) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: "DELETE",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: list }),
  }).catch((e) => console.error("[storage] ลบไฟล์ไม่สำเร็จ:", e.message));
}

/** ค่าที่เก็บใน DB (path หรือ URL เต็ม) -> URL ที่หน้าเว็บใช้แสดงรูปได้ */
function publicUrl(value) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) return null; // รูปเก่าบนดิสก์ชั่วคราว ไฟล์หายไปแล้ว
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${value}`;
}

/** path ที่เป็นของ Storage เราจริง (ใช้ตอนลบ) */
function storagePathOf(value) {
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("/uploads/")) return null;
  return value;
}

module.exports = { isConfigured, uploadObject, deleteObjects, publicUrl, storagePathOf, BUCKET };
