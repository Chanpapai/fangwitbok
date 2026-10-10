// ย่อรูปบนเครื่องผู้ใช้ก่อนอัปโหลด: รูปจากมือถือมักใหญ่เกิน 5MB และเปลือง Bandwidth ของ Free Tier
// ถ้าเบราว์เซอร์ย่อไม่ได้จะคืนไฟล์เดิม (Backend ยังตรวจ "ไฟล์จริง" และย่อซ้ำอีกชั้น)
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ACCEPT_ATTR = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
export const ACCEPT = ACCEPT_ATTR; // ชื่อสั้น (ใช้ในหน้าตั้งค่า)
export const TYPE_ERROR = "รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF เท่านั้น";
export const MAX_BYTES = 5 * 1024 * 1024;

// มือถือ/Chromebook บางรุ่นส่ง file.type ว่าง จึงเช็กนามสกุลไฟล์เป็นตัวสำรอง
export function isAllowedImage(file) {
  if (ALLOWED_TYPES.includes(file.type)) return true;
  return (!file.type || file.type === "application/octet-stream") && /\.(jpe?g|png|webp|gif)$/i.test(file.name || "");
}

export async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  // GIF: ห้ามผ่าน canvas เพราะจะเสียแอนิเมชัน (เหลือเฟรมแรก) — ส่งไฟล์เดิม ให้ Backend ย่อแบบคงแอนิเมชัน
  if (file.type === "image/gif" || /\.gif$/i.test(file.name || "")) return file;
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

/** รูปโปรไฟล์: ตัดเป็นสี่เหลี่ยมจัตุรัสตรงกลาง แล้วย่อ (GIF ใช้เฟรมแรก) — คืน { blob, dataUrl } (throw ข้อความไทยถ้าอ่านรูปไม่ได้) */
export async function makeAvatar(file, size = 256) {
  if (!isAllowedImage(file)) throw new Error(TYPE_ERROR);
  if (file.size > MAX_BYTES * 2) throw new Error("ไฟล์ใหญ่เกินไป");
  let bmp;
  try { bmp = await createImageBitmap(file, { imageOrientation: "from-image" }); } catch { throw new Error("อ่านรูปนี้ไม่ได้ ลองเลือกรูปอื่น"); }
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  canvas.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  bmp.close?.();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.85));
  if (!blob) throw new Error("ย่อรูปไม่สำเร็จ");
  const dataUrl = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
  return { blob, dataUrl };
}
