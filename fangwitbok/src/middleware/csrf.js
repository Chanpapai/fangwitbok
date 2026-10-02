const crypto = require("crypto");

// ป้องกัน CSRF เฉพาะ endpoint ที่พึ่งพา cookie (refresh/logout)
// endpoint อื่น ๆ ใช้ Authorization: Bearer header ซึ่งเบราว์เซอร์ไม่แนบอัตโนมัติข้ามเว็บไซต์
// จึงไม่มีช่องโหว่ CSRF อยู่แล้วในตัว (ต่างจาก cookie ที่เบราว์เซอร์แนบให้เองทุกครั้ง)
//
// Double-submit cookie pattern: cookie "csrfToken" (อ่านได้ด้วย JS) ต้องตรงกับ
// header "x-csrf-token" ที่ client ส่งมา — เว็บไซต์อื่นจะอ่าน cookie ของโดเมนเราไม่ได้
// จึงปลอม header ให้ตรงกับ cookie ไม่ได้

function issueCsrfCookie(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie("csrfToken", token, {
    httpOnly: false,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  return token;
}

function verifyCsrf(req, res, next) {
  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers["x-csrf-token"];
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "คำขอไม่ผ่านการตรวจสอบความปลอดภัย (CSRF)" });
  }
  next();
}

module.exports = { issueCsrfCookie, verifyCsrf };
