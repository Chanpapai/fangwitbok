const rateLimit = require("express-rate-limit");

const make = (windowMs, limit, error) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error } });

const authLimiter = make(15 * 60 * 1000, 10, "พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่");
// ผู้เข้าชมทั่วไปไม่ต้อง Login จึงจำกัดตาม IP เพื่อกันสแปม
const postLimiter = make(10 * 60 * 1000, 5, "โพสต์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่");
const commentLimiter = make(10 * 60 * 1000, 12, "คอมเมนต์ถี่เกินไป กรุณารอสักครู่");
const reportLimiter = make(10 * 60 * 1000, 6, "รายงานถี่เกินไป กรุณารอสักครู่");
const likeLimiter = make(60 * 1000, 40, "ทำรายการถี่เกินไป กรุณารอสักครู่");
const supportCreateLimiter = make(60 * 60 * 1000, 5, "เปิดแชทถี่เกินไป กรุณาลองใหม่ภายหลัง");
const supportMessageLimiter = make(60 * 1000, 15, "ส่งข้อความถี่เกินไป กรุณารอสักครู่");
const writeLimiter = make(60 * 1000, 30, "ทำรายการถี่เกินไป กรุณารอสักครู่");
const generalLimiter = rateLimit({ windowMs: 60 * 1000, limit: 240, standardHeaders: true, legacyHeaders: false });

module.exports = {
  authLimiter, postLimiter, commentLimiter, reportLimiter, likeLimiter,
  supportCreateLimiter, supportMessageLimiter, writeLimiter, generalLimiter,
};
