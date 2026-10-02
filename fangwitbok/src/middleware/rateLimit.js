const rateLimit = require("express-rate-limit");

// ล็อกอิน/สมัคร: จำกัดเข้มเพื่อกัน brute-force รหัสผ่าน
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
});

// สร้างโพสต์/คอมเมนต์/รายงาน: กันสแปมถล่มระบบ
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ทำรายการถี่เกินไป กรุณารอสักครู่" },
});

// ทั่วไป: กันการยิง API รัว ๆ ระดับสูงสุด
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, writeLimiter, generalLimiter };
