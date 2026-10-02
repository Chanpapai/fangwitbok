const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");
const sharp = require("sharp");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
const MAX_DIMENSION = 2000; // ย่อรูปใหญ่เกินไปลง กันไฟล์ decompression-bomb และประหยัดพื้นที่

/**
 * แปลงไฟล์ที่อัปโหลดมา (buffer) ให้เป็น WebP เสมอ ไม่ว่าไฟล์ต้นทางจะเป็นอะไร
 * - ใช้ sharp "ถอดรหัสรูปจริง" เป็นการยืนยันว่าไฟล์เป็นรูปจริง ไม่ใช่ไฟล์อันตรายที่ปลอม
 *   นามสกุล/มาสก์เป็นรูป (ถ้า sharp ถอดไม่ได้ จะ throw แล้วเรา reject ไฟล์นั้นทันที)
 * - บันทึกใหม่ทั้งหมด = ล้าง metadata/exif และ payload แปลกปลอมที่อาจแฝงอยู่ในไฟล์ต้นฉบับ
 * - ตั้งชื่อไฟล์แบบสุ่มเสมอ (ไม่ใช้ชื่อ/นามสกุลจากผู้ใช้) กัน path traversal และไฟล์หลอกนามสกุลซ้อน
 */
async function processAndSaveImages(files) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const saved = [];

  for (const file of files) {
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;
    const outPath = path.join(UPLOAD_DIR, filename);

    await sharp(file.buffer)
      .rotate() // ปรับตาม EXIF orientation ก่อนจะล้าง metadata ทิ้ง
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);

    saved.push(`/uploads/${filename}`);
  }
  return saved;
}

/** ลบไฟล์รูปจริงออกจากดิสก์ (เรียกตอนลบถาวร/purge trash) — ไม่ throw ถ้าหาไฟล์ไม่เจอ */
async function deleteImageFile(url) {
  const filename = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.unlink(filePath).catch(() => {});
}

module.exports = { processAndSaveImages, deleteImageFile, UPLOAD_DIR };
