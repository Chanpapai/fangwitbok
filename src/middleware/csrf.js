// ป้องกัน CSRF ของ endpoint ที่อาศัย cookie (refresh/logout) ด้วยการตรวจ Origin + header เฉพาะ
// เว็บอื่นปลอม Origin ไม่ได้ และ header x-requested-with ต้องผ่าน CORS preflight ก่อนเสมอ
// endpoint อื่นใช้ Authorization: Bearer ซึ่งเบราว์เซอร์ไม่แนบให้อัตโนมัติ จึงไม่มีช่องโหว่ CSRF
const allowedOrigins = () => (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);

function verifyCsrf(req, res, next) {
  const origin = req.headers.origin;
  if (!origin || !allowedOrigins().includes(origin) || req.headers["x-requested-with"] !== "fwb") {
    return res.status(403).json({ error: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย (CSRF)" });
  }
  next();
}

module.exports = { verifyCsrf };
