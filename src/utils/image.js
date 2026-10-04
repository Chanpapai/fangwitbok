const crypto = require("crypto");
const sharp = require("sharp");
const { supabaseAdmin } = require("../config/supabaseStorage");

const BUCKET = process.env.SUPABASE_BUCKET || "fangwitbok-uploads";
const MAX_DIMENSION = 2000; // ย่อรูปใหญ่เกินไปลง กัน decompression-bomb และประหยัด storage ฟรี

/**
 * แปลงไฟล์ที่อัปโหลดมา (buffer) ให้เป็น WebP เสมอ แล้วอัปโหลดขึ้น Supabase Storage
 * (persistent — ไม่หายเมื่อ Render build/deploy ใหม่ ต่างจากเก็บไว้ในดิสก์ของเซิร์ฟเวอร์เดิม)
 *
 * - sharp "ถอดรหัสรูปจริง" ก่อนบันทึก = ยืนยันว่าเป็นไฟล์รูปจริง ไม่ใช่ไฟล์อันตรายสวมรอยนามสกุล
 *   (ถอดไม่ได้ก็ throw แล้ว reject ไฟล์นั้นทันที)
 * - บันทึกใหม่ทั้งหมด = ล้าง EXIF/metadata และ payload แปลกปลอมที่อาจแฝงมากับไฟล์ต้นฉบับ
 * - ตั้งชื่อไฟล์สุ่มเสมอ (ไม่ใช้ชื่อ/นามสกุลจากผู้ใช้) กัน path traversal และไฟล์หลอกนามสกุลซ้อน
 *
 * @param {{buffer: Buffer}[]} files
 * @param {string} folder เช่น "posts", "popups", "rules" (แยกโฟลเดอร์ในบักเก็ตเดียวกัน)
 * @returns {Promise<{url:string, path:string}[]>}
 */
async function processAndSaveImages(files, folder = "posts") {
  const saved = [];

  for (const file of files) {
    const filename = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.webp`;

    const buffer = await sharp(file.buffer)
      .rotate() // ปรับตาม EXIF orientation ก่อนจะล้าง metadata ทิ้ง
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: "image/webp", upsert: false });
    if (error) throw new Error(`อัปโหลดรูปไม่สำเร็จ: ${error.message}`);

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(filename);
    saved.push({ url: data.publicUrl, path: filename });
  }
  return saved;
}

/** ลบไฟล์รูปออกจาก Supabase Storage จริง (เรียกตอนลบถาวร/purge trash) — ไม่ throw ถ้าหาไฟล์ไม่เจอ */
async function deleteImageFile(storagePath) {
  if (!storagePath) return;
  await supabaseAdmin.storage.from(BUCKET).remove([storagePath]).catch(() => {});
}

module.exports = { processAndSaveImages, deleteImageFile, BUCKET };
