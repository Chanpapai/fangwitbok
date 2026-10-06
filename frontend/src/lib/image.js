// เตรียมรูปบนเครื่องผู้ใช้ก่อนอัปโหลด: รองรับ JPG, PNG, WebP, GIF
// - รูปจากมือถือมักใหญ่เกิน 5MB: ย่อ (JPG/PNG/WebP) เป็น WebP ก่อนส่ง ประหยัด Bandwidth ของ Free Tier
// - GIF ส่งไฟล์เดิม (ไม่ย่อบนเครื่อง เพราะ canvas จะเก็บแค่เฟรมแรก ทำให้อนิเมชันหาย) แล้วให้ Backend แปลงเป็น WebP เคลื่อนไหวให้
// - บางเครื่อง/เบราว์เซอร์ส่ง type ว่าง หรือ image/jpg จึงตรวจจากนามสกุลสำรอง และตั้ง type ให้ถูกก่อนส่ง
// ถ้าเบราว์เซอร์ย่อไม่ได้จะคืนไฟล์เดิม (Backend ตรวจไบต์จริงและย่อซ้ำอีกชั้น)
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT = ALLOWED_TYPES.join(",");
export const MAX_BYTES = 5 * 1024 * 1024;
export const TYPE_ERROR = "รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF เท่านั้น";
const BY_EXT = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

export function detectType(file) {
  let t = (file.type || "").toLowerCase();
  if (t === "image/jpg" || t === "image/pjpeg") t = "image/jpeg";
  if (!ALLOWED_TYPES.includes(t) && (!t || t === "application/octet-stream")) {
    t = BY_EXT[(file.name || "").split(".").pop().toLowerCase()] || "";
  }
  return ALLOWED_TYPES.includes(t) ? t : "";
}

export async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) { bmp.close?.(); return file; }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], "image.webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** ตรวจชนิด/ขนาด + ย่อ แล้วคืนไฟล์ที่พร้อมอัปโหลด (throw Error ข้อความภาษาไทยถ้าใช้ไม่ได้) */
export async function prepareImage(file) {
  const type = detectType(file);
  if (!type) throw new Error(TYPE_ERROR);
  let out = type === "image/gif" ? file : await shrinkImage(file);
  if (out.size > MAX_BYTES) throw new Error("ไฟล์ใหญ่เกินไป (สูงสุด 5MB ต่อไฟล์)");
  if (out === file && file.type !== type) out = new File([file], file.name || "image", { type });
  return out;
}
