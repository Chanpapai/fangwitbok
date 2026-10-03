const { verifyAccessToken } = require("../utils/jwt");
const prisma = require("../config/db");

const ROLE_RANK = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };

/**
 * ต้องล็อกอิน — ตรวจ JWT แล้ว "query DB ซ้ำ" ทุกครั้งเพื่อเอาสิทธิ์ล่าสุดจริง
 * (ไม่เชื่อ role ที่ฝังมาใน token เฉย ๆ เพราะถ้า Super Admin เพิ่งลดสิทธิ์/แบนคนนี้ไป
 * token เก่าที่ยังไม่หมดอายุจะต้องใช้ไม่ได้ทันที ไม่ใช่รอจนหมดอายุ 15 นาที)
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });

    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user) return res.status(401).json({ error: "ไม่พบบัญชีผู้ใช้" });
    if (user.isBanned) return res.status(403).json({ error: "บัญชีนี้ถูกระงับการใช้งาน" });

    req.user = user; // สิทธิ์จริงจาก DB ณ เวลานี้เท่านั้น — handler ทุกตัวใช้ req.user.role นี้
    next();
  } catch (err) {
    return res.status(401).json({ error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
  }
}

/** เช็คสิทธิ์ขั้นต่ำ — ใช้ต่อจาก requireAuth เสมอ เช่น requireRole("ADMIN") อนุญาตทั้ง ADMIN และ SUPER_ADMIN */
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบ" });
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minRole]) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงส่วนนี้" });
    }
    next();
  };
}

/** ล็อกอินหรือไม่ก็ได้ — ใช้กับ endpoint สาธารณะที่อยากรู้ว่าใครดูอยู่ (เช่น เช็คว่ากดใจไปแล้วหรือยัง) */
async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next();
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user && !user.isBanned) req.user = user;
    next();
  } catch {
    next();
  }
}

module.exports = { requireAuth, requireRole, optionalAuth, ROLE_RANK };
