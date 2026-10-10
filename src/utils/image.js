const crypto = require("crypto");
const sharp = require("sharp");
const { uploadObject, deleteObjects, storagePathOf } = require("../config/storage");

const MAX_DIMENSION = 1600; // ย่อรูปใหญ่ลง ประหยัด Storage (Free Tier 1GB) และกัน decompression bomb
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);
const FOLDERS = new Set(["posts", "popups", "rules", "site"]);

/**
 * แปลงรูปเป็น WebP แล้วเก็บใน Supabase Storage (ถาวร ไม่หายเมื่อ Deploy ใหม่)
 * - sharp ถอดรหัสรูปจริง: ไฟล์ปลอมนามสกุลจะ throw และล้าง EXIF/payload แปลกปลอม
 * - ชื่อไฟล์สุ่มเสมอ กัน path traversal
 * คืน [{ path, width, height }]
 */
async function processAndSaveImages(files, folder = "posts") {
  if (!FOLDERS.has(folder)) throw new Error("invalid folder");
  const saved = [];
  try {
    for (const file of files) {
      // ตรวจ "ไฟล์จริง" จาก magic bytes (ไม่เชื่อ mimetype/นามสกุล) — รับเฉพาะ JPG/PNG/WebP/GIF
      const meta = await sharp(file.buffer, { limitInputPixels: 40_000_000 }).metadata();
      if (!ALLOWED_FORMATS.has(meta.format)) throw new Error("unsupported image format");
      const animated = (meta.pages || 1) > 1; // GIF/WebP เคลื่อนไหว: เก็บทุกเฟรม ไม่แปลงเป็นภาพนิ่ง
      const img = sharp(file.buffer, { limitInputPixels: 40_000_000, animated });
      const { data, info } = await (animated
        ? img.resize({ width: MAX_DIMENSION, withoutEnlargement: true })
        : img.rotate().resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      )
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true });
      const objectPath = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;
      await uploadObject(objectPath, data, "image/webp");
      saved.push({ path: objectPath, width: info.width, height: animated ? Math.round(info.height / (info.pages || 1)) : info.height });
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
