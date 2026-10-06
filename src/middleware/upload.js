const multer = require("multer");

// ชั้นแรก: กรองจาก mimetype ที่เบราว์เซอร์แจ้งมา (บางเครื่องส่ง image/jpg, image/pjpeg หรือ octet-stream มา จึงรับไว้ก่อน)
// ชั้นจริง: sharp ตรวจ "ไบต์จริงของไฟล์" ใน processAndSaveImages — ต้องเป็น JPEG/PNG/WebP/GIF เท่านั้น
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/x-png", "image/webp", "image/gif",
  "application/octet-stream",
]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB ต่อไฟล์
const MAX_FILES = 5;

// เก็บไว้ในหน่วยความจำก่อน (ไม่เขียนลงดิสก์ตรง ๆ) เพื่อให้ sharp ตรวจสอบ/ประมวลผลซ้ำก่อนบันทึกจริง
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter(req, file, cb) {
    if (!ALLOWED_MIME.has(String(file.mimetype).toLowerCase())) {
      return cb(new Error("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ GIF เท่านั้น"));
    }
    cb(null, true);
  },
});

module.exports = { upload, MAX_FILE_BYTES, MAX_FILES, ALLOWED_MIME };
