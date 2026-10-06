const crypto = require("crypto");
const sharp = require("sharp");
const { uploadObject, deleteObjects, storagePathOf } = require("../config/storage");

const MAX_DIMENSION = 1600; // ย่อรูปใหญ่ลง ประหยัด Storage (Free Tier 1GB) และกัน decompression bomb
const MAX_PIXELS = 40_000_000; // รวมทุกเฟรมของ GIF ด้วย (GIF ยาว/ใหญ่เกินจะถูกปฏิเสธ)
const FOLDERS = new Set(["posts", "popups", "rules", "site"]);
const REAL_FORMATS = new Set(["jpeg", "png", "webp", "gif"]); // ตรวจจากไบต์จริง ไม่เชื่อนามสกุล/mimetype

/**
 * แปลงรูป (JPG/PNG/WebP/GIF) เป็น WebP แล้วเก็บใน Supabase Storage (ถาวร ไม่หายเมื่อ Deploy ใหม่)
 * - sharp ถอดรหัสรูปจริง: ไฟล์ปลอมนามสกุลจะ throw และล้าง EXIF/payload แปลกปลอม
 * - GIF เคลื่อนไหว -> WebP เคลื่อนไหว (คงอนิเมชัน) ส่วนรูปนิ่งหมุนตาม EXIF
 * - ชื่อไฟล์สุ่มเสมอ กัน path traversal
 * คืน [{ path, width, height }]
 */
async function processAndSaveImages(files, folder = "posts") {
  if (!FOLDERS.has(folder)) throw new Error("invalid folder");
  const saved = [];
  try {
    for (const file of files) {
      const meta = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS, animated: true }).metadata();
      if (!REAL_FORMATS.has(meta.format)) throw new Error("INVALID_IMAGE_FORMAT");
      const frames = meta.pages || 1;
      const animated = frames > 1;

      let pipe = sharp(file.buffer, { limitInputPixels: MAX_PIXELS, animated });
      if (!animated) pipe = pipe.rotate();
      const { data } = await pipe
        .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, ...(animated ? { effort: 3 } : {}) })
        .toBuffer({ resolveWithObject: true });

      // ขนาดต่อเฟรม (animated: info.height อาจเป็นความสูงรวมทุกเฟรม จึงคำนวณจาก metadata แทน)
      const baseW = meta.width;
      const baseH = meta.pageHeight || meta.height;
      const swap = !animated && meta.orientation >= 5 && meta.orientation <= 8;
      const [w0, h0] = swap ? [baseH, baseW] : [baseW, baseH];
      const scale = Math.min(1, MAX_DIMENSION / Math.max(w0, h0));

      const objectPath = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;
      await uploadObject(objectPath, data, "image/webp");
      saved.push({ path: objectPath, width: Math.round(w0 * scale), height: Math.round(h0 * scale) });
    }
  } catch (err) {
    await deleteObjects(saved.map((s) => s.path)); // ล้มกลางทาง = ลบที่อัปไปแล้วทิ้ง ไม่ให้เหลือไฟล์ค้าง
    throw err;
  }
  return saved;
}

async function deleteImageFile(value) {
  const p = storagePathOf(value);
  if (p) await deleteObjects([p]);
}

module.exports = { processAndSaveImages, deleteImageFile };
