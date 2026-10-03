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
  await prisma.$disconnect();
})();
