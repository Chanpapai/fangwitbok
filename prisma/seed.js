// สร้าง Super Admin คนแรกจากตัวแปรแวดล้อมเท่านั้น (ไม่ฝังรหัสผ่านในซอร์สโค้ด)
// รัน: SEED_ADMIN_NAME="ชื่อจริง" SEED_ADMIN_PASSWORD=xxxxxxxx1 npm run seed
// ทีมงานเข้าสู่ระบบด้วย "ชื่อจริง + รหัสผ่าน" (ไม่มีรหัสผู้ดูแลแยกแล้ว)
require("dotenv").config();
const crypto = require("crypto");
const prisma = require("../src/config/db");
const { hashPassword } = require("../src/utils/password");

async function main() {
  const displayName = (process.env.SEED_ADMIN_NAME || "").trim();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!displayName || !password) {
    console.error("ต้องตั้งค่า SEED_ADMIN_NAME (ชื่อจริง) และ SEED_ADMIN_PASSWORD ก่อนรัน seed");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("SEED_ADMIN_PASSWORD ต้องยาวอย่างน้อย 8 ตัวอักษร");
    process.exit(1);
  }

  const existing = await prisma.user.findFirst({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] }, displayName: { equals: displayName, mode: "insensitive" } },
  });
  if (existing) {
    console.log(`มีทีมงานชื่อ "${existing.displayName}" อยู่แล้ว (role: ${existing.role}) — ข้ามการสร้างใหม่`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      studentCode: `staff-${crypto.randomBytes(6).toString("hex")}`, // ค่าภายในเท่านั้น ไม่ใช้ล็อกอิน
      passwordHash: await hashPassword(password),
      displayName,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`สร้าง Super Admin สำเร็จ: ${user.displayName} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
