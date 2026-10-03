// สร้าง Super Admin คนแรกจากตัวแปรแวดล้อมเท่านั้น (ไม่ฝังรหัสผ่านในซอร์สโค้ด)
// รัน: SEED_ADMIN_CODE=admin001 SEED_ADMIN_PASSWORD=xxxxxxxx SEED_ADMIN_NAME="ผู้ดูแลระบบ" npm run seed
require("dotenv").config();
const prisma = require("../src/config/db");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const studentCode = process.env.SEED_ADMIN_CODE;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const displayName = process.env.SEED_ADMIN_NAME || "ผู้ดูแลระบบ";

  if (!studentCode || !password) {
    console.error("ต้องตั้งค่า SEED_ADMIN_CODE และ SEED_ADMIN_PASSWORD ก่อนรัน seed");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("SEED_ADMIN_PASSWORD ต้องยาวอย่างน้อย 8 ตัวอักษร");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { studentCode } });
  if (existing) {
    console.log(`มีบัญชี ${studentCode} อยู่แล้ว (role: ${existing.role}) — ข้ามการสร้างใหม่`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { studentCode, passwordHash, displayName, role: "SUPER_ADMIN" },
  });
  console.log(`สร้าง Super Admin สำเร็จ: ${user.studentCode} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
