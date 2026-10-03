// Middleware กลาง: ตรวจสอบ req.body ด้วย zod schema ก่อนถึง route handler
// ป้องกัน input ที่ผิดรูปแบบ/เกินขนาด/ชนิดข้อมูลผิด ไม่ให้ถึงชั้น business logic เลย
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "ข้อมูลไม่ถูกต้อง",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // ใช้ค่าที่ผ่านการ parse/trim แล้วเท่านั้น
    next();
  };
}

module.exports = { validateBody };
