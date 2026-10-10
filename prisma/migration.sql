-- ไม่จำเป็นต้องรันเอง: `npm run build` (prisma db push) สร้างให้อัตโนมัติ
-- ใช้เฉพาะกรณีอยากรันเองที่ Supabase > SQL Editor (ปลอดภัย รันซ้ำได้ ไม่ลบข้อมูล)

-- รอบ 2: โปรไฟล์ทีมงาน (ลิงก์ Instagram/Facebook) + สถานะอ่านข้อความแชท (ข้อความเดิมถือว่าอ่านแล้ว)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebookUrl"  TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT true;

-- (ไม่บังคับ) ตั้งตัวนับ "ค้างอ่าน" ของห้องแชทให้ตรงกับสถานะอ่านจริง — ระบบก็ปรับให้เองเมื่อเปิดแชท
UPDATE "SupportThread" t SET
  "unreadForVisitor" = (SELECT COUNT(*) FROM "SupportMessage" m WHERE m."threadId" = t."id" AND m."sender" = 'ADMIN'   AND m."isRead" = false),
  "unreadForAdmin"   = (SELECT COUNT(*) FROM "SupportMessage" m WHERE m."threadId" = t."id" AND m."sender" = 'VISITOR' AND m."isRead" = false);
