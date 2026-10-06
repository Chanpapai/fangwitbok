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

  // ขั้นที่ 0: สำรองทุกตารางใน schema public ไปไว้ที่ schema "legacy_backup" (ครั้งเดียว ไม่ทับของเดิม)
  // Prisma จัดการเฉพาะ schema public จึงไม่แตะ legacy_backup — ถ้า db push ลบ/แปลงข้อมูลเก่า ยังกู้จากที่นี่ได้
  // (ดูได้ที่ Supabase > Table Editor > เลือก schema "legacy_backup")
  try {
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS legacy_backup`);
    const tables = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name NOT LIKE '\\_prisma%'`
    );
    for (const { table_name } of tables) {
      const t = String(table_name).replace(/"/g, '""');
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS legacy_backup."${t}" AS SELECT * FROM public."${t}"`);
    }
    // ตารางสำรองต้องไม่ผูกกับชนิด enum ของ public (ไม่งั้น Prisma ลบ/แก้ enum ไม่ได้) จึงแปลงคอลัมน์ enum เป็น text
    // ค่าข้อมูลเหมือนเดิมทุกอย่าง รันซ้ำได้ปลอดภัย
    const enumCols = await prisma.$queryRawUnsafe(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'legacy_backup' AND data_type = 'USER-DEFINED'`
    );
    for (const { table_name, column_name } of enumCols) {
      const t = String(table_name).replace(/"/g, '""');
      const c = String(column_name).replace(/"/g, '""');
      await prisma.$executeRawUnsafe(`ALTER TABLE legacy_backup."${t}" ALTER COLUMN "${c}" TYPE text USING "${c}"::text`);
    }
    console.log(`[migrate] สำรอง ${tables.length} ตารางไปที่ schema legacy_backup: เรียบร้อย (แปลง enum เป็น text ${enumCols.length} คอลัมน์)`);
  } catch (err) {
    // สำรองไม่สำเร็จ = หยุด build ทันที ไม่ปล่อยให้ db push ลบข้อมูลโดยไม่มีที่สำรอง
    console.error(`[migrate] สำรองข้อมูลไม่สำเร็จ หยุด build: ${String(err.message).split("\n")[0]}`);
    process.exit(1);
  }

  // ลบแถว Like ซ้ำ (postId+userId เดียวกัน) เพื่อให้เพิ่ม unique constraint ได้
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "Like" a USING "Like" b WHERE a.ctid < b.ctid AND a."postId" = b."postId" AND a."userId" IS NOT NULL AND a."userId" = b."userId"`
    );
  } catch (err) {
    console.warn(`[migrate] ข้ามขั้นลบ Like ซ้ำ: ${String(err.message).split("\n")[0]}`);
  }
  for (const [sql, label] of STEPS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[migrate] ${label}: เรียบร้อย`);
    } catch (err) {
      // ครั้งแรกบนฐานข้อมูลใหม่ที่ยังไม่มีตาราง จะเข้าเคสนี้ — ไม่เป็นปัญหา
      console.warn(`[migrate] ข้าม "${label}": ${String(err.message).split("\n")[0]}`);
    }
  }

  // ลบแจ้งเตือนที่ใช้ค่า enum เก่า (POST_RESOLVED, NEW_SUPPORT_TICKET) ก่อน
  // เมื่อไม่มีแถวไหนใช้ค่าเหล่านี้แล้ว `prisma db push` จะปรับ enum ให้ตรงกับ schema เองได้
  // (ข้อมูลเดิมถูกสำรองไว้ใน legacy_backup แล้วตั้งแต่ขั้นที่ 0)
  try {
    const n = await prisma.$executeRawUnsafe(
      `DELETE FROM "Notification" WHERE "type"::text IN ('POST_RESOLVED','NEW_SUPPORT_TICKET')`
    );
    console.log(`[migrate] ลบแจ้งเตือนชนิดเก่า (POST_RESOLVED/NEW_SUPPORT_TICKET): ${n} แถว`);
  } catch (err) {
    console.error(`[migrate] ลบแจ้งเตือนชนิดเก่าไม่สำเร็จ: ${String(err.message)}`);
  }

  // ตาราง SupportMessage โครงสร้างเก่า (ก่อนมีระบบแชทแบบเธรด) แปลงเป็นโครงสร้างใหม่ตรง ๆ ไม่ได้
  // สำรองข้อมูลเดิมเป็น JSON ไว้ในตาราง "_legacy_SupportMessage" ก่อน แล้วลบตารางเก่าให้ db push สร้างใหม่
  // ปลอดภัยที่จะรันซ้ำ: ถ้าตารางไม่มี หรือเป็นโครงสร้างใหม่ (มี threadId) แล้วจะข้ามทันที
  try {
    const cols = await prisma.$queryRawUnsafe(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'SupportMessage'`
    );
    const hasTable = cols.length > 0;
    const isOldLayout = hasTable && !cols.some((c) => c.column_name === "threadId");
    if (isOldLayout) {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS "_legacy_SupportMessage" AS SELECT row_to_json(t)::jsonb AS data, now() AS "backedUpAt" FROM "SupportMessage" t`
      );
      await prisma.$executeRawUnsafe(`DROP TABLE "SupportMessage"`);
      console.log("[migrate] สำรองและลบตาราง SupportMessage โครงสร้างเก่า: เรียบร้อย (ข้อมูลเดิมอยู่ใน _legacy_SupportMessage)");
      try { await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "SupportSender"`); }
      catch (e) { console.warn(`[migrate] ข้ามลบ SupportSender: ${String(e.message).split("\n")[0]}`); }
    } else {
      console.log("[migrate] SupportMessage ตรงกับโครงสร้างใหม่แล้ว / ยังไม่มีตาราง");
    }
  } catch (err) {
    console.warn(`[migrate] ข้ามขั้นปรับ SupportMessage: ${String(err.message).split("\n")[0]}`);
  }
  await prisma.$disconnect();
})();
