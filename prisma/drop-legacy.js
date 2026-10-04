// รันก่อน `prisma db push` ตอน build: ลบระบบสถานะ "เจอของแล้ว/ยังไม่เจอ" ออกจากฐานข้อมูลเดิมอย่างชัดเจน
// (ทำแยกไว้เพื่อให้ `prisma db push` ยังคงเข้มงวด — ไม่ต้องใช้ --accept-data-loss ซึ่งอาจลบข้อมูลอื่นโดยไม่รู้ตัว)
// ปลอดภัยที่จะรันซ้ำ: ใช้ IF EXISTS ทุกคำสั่ง และถ้าขั้นไหนพลาดจะแค่เตือนแล้วทำขั้นถัดไปต่อ
const { PrismaClient } = require("@prisma/client");

const STEPS = [
  ['DELETE FROM "Notification" WHERE "type"::text = \'POST_RESOLVED\'', "ล้างแจ้งเตือนชนิด POST_RESOLVED"],
  ['ALTER TABLE IF EXISTS "Post" DROP COLUMN IF EXISTS "lostStatus"', "ลบคอลัมน์ Post.lostStatus"],
  ['DROP TYPE IF EXISTS "LostStatus"', "ลบชนิดข้อมูล LostStatus"],
];

(async () => {
  const prisma = new PrismaClient();
  for (const [sql, label] of STEPS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[migrate] ${label}: เรียบร้อย`);
    } catch (err) {
      // ครั้งแรกบนฐานข้อมูลใหม่ที่ยังไม่มีตาราง จะเข้าเคสนี้ — ไม่เป็นปัญหา
      console.warn(`[migrate] ข้าม "${label}": ${String(err.message).split("\n")[0]}`);
    }
  }

  // เอาค่า POST_RESOLVED ออกจาก enum NotificationType เอง (ให้ตรงกับ schema.prisma)
  // ทำให้ `prisma db push` ไม่เห็นความต่าง จึงไม่เตือน "data loss" แล้วหยุด build
  // ปลอดภัยที่จะรันซ้ำ: ถ้าค่านี้ไม่อยู่ใน enum แล้วจะข้ามทันที
  try {
    const found = await prisma.$queryRawUnsafe(
      `SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'NotificationType' AND e.enumlabel = 'POST_RESOLVED'`
    );
    if (found.length) {
      await prisma.$transaction([
        prisma.$executeRawUnsafe(`DELETE FROM "Notification" WHERE "type"::text = 'POST_RESOLVED'`),
        prisma.$executeRawUnsafe(`ALTER TYPE "NotificationType" RENAME TO "NotificationType_old"`),
        prisma.$executeRawUnsafe(`CREATE TYPE "NotificationType" AS ENUM ('NEW_POST','NEW_REPORT','SYSTEM','SUPPORT_MESSAGE')`),
        prisma.$executeRawUnsafe(`ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::text::"NotificationType"`),
        prisma.$executeRawUnsafe(`DROP TYPE "NotificationType_old"`),
      ]);
      console.log("[migrate] เอา POST_RESOLVED ออกจาก enum NotificationType: เรียบร้อย");
    } else {
      console.log("[migrate] enum NotificationType ตรงกับ schema แล้ว");
    }
  } catch (err) {
    console.warn(`[migrate] ข้ามขั้นปรับ enum: ${String(err.message).split("\n")[0]}`);
  }
  await prisma.$disconnect();
})();
