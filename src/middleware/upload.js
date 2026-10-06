const multer = require("multer");

// เบราว์เซอร์/มือถือบางรุ่นส่ง mimetype ว่างหรือ application/octet-stream มา จึงปล่อยผ่านชั้นนี้แล้วให้ sharp ตรวจ "ไฟล์จริง" ใน processAndSaveImages
const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp", "image/gif", "application/octet-stream", ""]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB ต่อไฟล์
const MAX_FILES = 5;

// เก็บไว้ในหน่วยความจำก่อน (ไม่เขียนลงดิสก์ตรง ๆ) เพื่อให้ sharp ตรวจสอบ/ประมวลผลซ้ำก่อนบันทึกจริง
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter(req, file, cb) {
    // กรองจาก mimetype ที่เบราว์เซอร์ส่งมาก่อนชั้นหนึ่ง (ชั้นจริงคือ sharp decode ใน processImages)
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP, GIF เท่านั้น"));
    }
    cb(null, true);
  },
});

module.exports = { upload, MAX_FILE_BYTES, MAX_FILES, ALLOWED_MIME };
