// ย่อรูปบนเครื่องผู้ใช้ก่อนอัปโหลด: รูปจากมือถือมักใหญ่เกิน 5MB และเปลือง Bandwidth ของ Free Tier
// ถ้าเบราว์เซอร์ย่อไม่ได้จะคืนไฟล์เดิม (Backend ยังตรวจและย่อซ้ำอีกชั้น)
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_BYTES = 5 * 1024 * 1024;

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
