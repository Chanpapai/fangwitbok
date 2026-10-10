-- ไม่จำเป็นต้องรันเอง: `npm run build` (prisma db push) สร้างให้อัตโนมัติ
-- ใช้เฉพาะกรณีอยากรันเองที่ Supabase > SQL Editor (ปลอดภัย รันซ้ำได้ ไม่ลบข้อมูล)
ALTER TABLE "Post"  ADD COLUMN IF NOT EXISTS "contactType" TEXT;
ALTER TABLE "Post"  ADD COLUMN IF NOT EXISTS "contactUrl"  TEXT;
ALTER TABLE "Popup" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Popup" ALTER COLUMN "title" SET DEFAULT '';
ALTER TABLE "Popup" ALTER COLUMN "body"  SET DEFAULT '';
CREATE INDEX IF NOT EXISTS "Post_deletedAt_createdAt_idx" ON "Post" ("deletedAt", "createdAt");

-- รอบ 2: โปรไฟล์ + สถานะอ่านข้อความแชท (ข้อความเดิมถือว่าอ่านแล้ว)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "facebookUrl"  TEXT;
ALTER TABLE "SupportMessage" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT true;
