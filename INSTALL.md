# ติดตั้ง FangwitBok V2 (Free Tier, ผ่านเว็บล้วน)

บริการ: **Supabase** (DB + เก็บรูปถาวร) · **Render** (Backend) · **Vercel** (หน้าเว็บ)

## 1) Supabase
1. สร้าง Project ที่ supabase.com (เก็บรหัสผ่าน DB ไว้)
2. **Storage** → New bucket ชื่อ `fangwitbok` → ติ๊ก **Public bucket**
3. **Project Settings → API**: copy `Project URL` (= `SUPABASE_URL`) และ `service_role` key (= `SUPABASE_SERVICE_ROLE_KEY`, ห้ามใส่ใน GitHub/หน้าเว็บ)
4. กดปุ่ม **Connect** → Connection string:
   - `DATABASE_URL` = **Transaction pooler** (พอร์ต 6543) ต่อท้าย `?pgbouncer=true&connection_limit=1`
   - `DIRECT_URL` = **Session pooler** (พอร์ต 5432) — ใช้ pooler ทั้งคู่ เพราะ Render ใช้ IPv4

## 2) Render (Backend)
GitHub repo → New Web Service (Root ว่าง) · Build: `npm install && npm run build` · Start: `npm start` · Free
Environment: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=fangwitbok`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SETUP_SECRET` (กด Generate คนละค่า), `NODE_ENV=production`, `CORS_ORIGIN=https://โดเมนVercelของคุณ` (ไม่มี `/` ท้าย)
ทดสอบ `/api/health` ต้องได้ `{"ok":true}`

## 3) Super Admin คนแรก
เปิด `https://API.onrender.com/api/setup?token=SETUP_SECRET` กรอกฟอร์ม (ใช้ได้ครั้งเดียว) แล้วลบ `SETUP_SECRET` ออก

## 4) Vercel (หน้าเว็บ)
Root Directory = `frontend` · Framework: Vite
แก้ `frontend/vercel.json` ใส่โดเมน Render ที่บรรทัด rewrite `/api/*` (ทำให้ cookie Admin ใช้ได้ทุกเบราว์เซอร์) แล้วเว้น `VITE_API_URL` ว่าง
จากนั้นแก้ `CORS_ORIGIN` ที่ Render ให้ตรงโดเมน Vercel

## การใช้งาน
- ผู้เข้าชมไม่ต้อง Login — โพสต์/คอมเมนต์/กดใจ/แจ้งปัญหาได้ทันที
- ทีมงาน: พิมพ์ `/staff` หรือแตะโลโก้หน้าแรก 7 ครั้ง → Login → `/admin` (เพิ่มแอดมินได้ที่แท็บ "ทีมงาน")
- ผู้เข้าชมลบโพสต์เองไม่ได้ — ก่อนกดส่งจะมี Popup ยืนยัน (ข้อความแก้ได้ที่ หลังบ้าน → ตั้งค่าหน้าเว็บไซต์) ถ้าต้องการลบให้แจ้งแอดมิน
- หลังบ้าน (`/admin`) แบ่งเมนูเป็นหมวด: ภาพรวม · โพสต์ · รายงาน · รูปภาพ (ดาวน์โหลดรูปได้) · ถังขยะ · คำร้อง/ติดต่อ Admin · Popup · กฎการใช้งาน · ตั้งค่าหน้าเว็บไซต์ (Super Admin: ข้อความหน้าแรก, ข้อความยืนยันก่อนโพสต์, โลโก้, รูป Profile) · สมาชิก Admin · บันทึกการทำงาน
- รูปโลโก้/Profile เก็บใน Supabase Storage (โฟลเดอร์ `site/`) ข้อความเก็บในตาราง `SiteSetting` จึงไม่หายเมื่อ Deploy ใหม่

## รอบที่ 2: โปรไฟล์ · ธีมสี · แชท
- **ตั้งค่า (`/settings`):** กดรูปโปรไฟล์มุมขวาบน → โปรไฟล์ (รูป + ลิงก์ Instagram/Facebook) + เลือกสีธีมพร้อมตัวอย่าง (จำไว้ในเครื่อง) · ทีมงานที่ล็อกอินเก็บโปรไฟล์ที่ฐานข้อมูล ซิงค์ทุกอุปกรณ์ ผู้เข้าชมทั่วไปเก็บในเครื่องนี้
- **โพสต์:** ลิงก์ติดต่อกลับในหน้า "ฝากบอก" เติมจากโปรไฟล์ให้ (แก้/ลบได้ และจะแนบก็ต่อเมื่อกดส่งโพสต์เอง) · มีปุ่มอิโมจิในช่องโพสต์และคอมเมนต์
- **แชท:** ปุ่มอิโมจิ, ปุ่มกระดิ่งเลื่อนไปข้อความค้างอ่านล่าสุด (สถานะอ่านเก็บที่ฐานข้อมูลต่อข้อความ), หน้าต่างแชทปรับตามคีย์บอร์ดเสมือน
- **Schema ที่เพิ่ม:** `User.instagramUrl/facebookUrl`, `SupportMessage.isRead` (ข้อความเดิมถือว่าอ่านแล้ว) — `db push` ทำให้เองตอน build หรือรัน `prisma/migration.sql`
- **Render ต้อง Deploy ใหม่** เพราะมี API ใหม่ (`/api/profile`, `/api/support/read`, `/api/admin/support/:id/read`)

## ข้อจำกัด Free Tier
- Render หลับหลังไม่มีคนใช้ ~15 นาที ครั้งแรกช้า 30–60 วินาที **ข้อมูลและรูปไม่หาย** (อยู่ที่ Supabase)
- Supabase: DB 500MB, Storage 1GB, Egress 5GB/เดือน — ระบบย่อรูปเป็น WebP ≤1600px, cache รูป 1 ปี, ไม่ดึง count แยก, Popup/กฎ cache 30 วินาที, แชทตรวจทุก 8–60 วินาทีเฉพาะตอนจำเป็น
- โปรเจกต์ Supabase ฟรีจะถูก pause ถ้าไม่มีการใช้งาน 7 วัน (กด Restore ได้ ข้อมูลยังอยู่)
- `npm run build` ใช้ `prisma db push` แบบไม่มี `--accept-data-loss` — ถ้า schema จะทำให้ข้อมูลหาย build จะหยุดแทนการลบ
- การลบระบบสถานะ "เจอของแล้ว/ยังไม่เจอ" ทำผ่านสคริปต์ `prisma/drop-legacy.js` (รันอัตโนมัติก่อน db push ตอน build, รันซ้ำได้ปลอดภัย)
- รูปเก่าที่เคยอยู่ในโฟลเดอร์ `uploads/` ของ Render หายไปแล้ว (ระบบจะไม่แสดงรูปเสีย)
