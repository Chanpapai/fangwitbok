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
- ทีมงาน: พิมพ์ `/staff` หรือแตะโลโก้หน้าแรก 7 ครั้ง → Login ด้วย **ชื่อจริง + รหัสผ่าน** (ไม่มีรหัสผู้ดูแลแล้ว มีปุ่มแสดง/ซ่อนรหัสผ่าน) → `/admin` (เพิ่มแอดมินได้ที่เมนู "สมาชิก Admin")
- ผู้เข้าชมลบโพสต์เองไม่ได้ — ก่อนกดส่งจะมี Popup ยืนยัน (ข้อความแก้ได้ที่ หลังบ้าน → ตั้งค่าหน้าเว็บไซต์) ถ้าต้องการลบให้แจ้งแอดมิน
- หลังบ้าน (`/admin`) แบ่งเมนูเป็นหมวด: ภาพรวม · โพสต์ · รายงาน · รูปภาพ (ดาวน์โหลดรูปได้) · ถังขยะ · คำร้อง/ติดต่อ Admin · Popup · กฎการใช้งาน · ตั้งค่าหน้าเว็บไซต์ (Super Admin: ข้อความหน้าแรก, ข้อความยืนยันก่อนโพสต์, โลโก้, รูป Profile) · สมาชิก Admin · บันทึกการทำงาน
- รูปโลโก้/Profile เก็บใน Supabase Storage (โฟลเดอร์ `site/`) ข้อความเก็บในตาราง `SiteSetting` จึงไม่หายเมื่อ Deploy ใหม่

## ฟีเจอร์ที่เพิ่มในรอบนี้
- **เข้าสู่ระบบทีมงาน:** ชื่อจริง + รหัสผ่าน (ชื่อทีมงานซ้ำกันไม่ได้) · Super Admin กด "ถอดออกจาก Admin" ได้ที่เมนู สมาชิก Admin (ตรวจสิทธิ์ที่ Backend + มีหน้าต่างยืนยัน + ตัดเซสชันทันที)
- **บัญชี Super Admin เดิม:** ล็อกอินด้วย "ชื่อที่แสดง" (displayName) เดิมของบัญชีนั้น + รหัสผ่านเดิม — ถ้าลืมชื่อ ดูได้ที่ Supabase > Table Editor > User
- **Popup:** หัวข้อ/ข้อความไม่บังคับ ใส่เฉพาะรูปได้ หลายรูปเป็น Carousel กดรูปขยายไม่ได้ (เก็บใน DB + Storage)
- **ช่องทางการติดต่อ (หน้าแรก):** หลังบ้าน → ช่องทางการติดต่อ ตั้งลิงก์ + เปิด/ปิด Instagram/Facebook/Discord (เก็บในตาราง SiteSetting)
- **ช่องทางติดต่อกลับในโพสต์:** ผู้โพสต์ใส่ลิงก์ Instagram/Facebook ได้ (ไม่บังคับ) ระบบตรวจโดเมนก่อนบันทึก
- **รูป:** รองรับ JPG, PNG, WebP, GIF (GIF เคลื่อนไหวคงอนิเมชัน) ตรวจจากไบต์จริงของไฟล์ · ระบบสร้าง/ตั้ง bucket เป็น Public ให้อัตโนมัติถ้ายังไม่มี
- **ติดตั้งเป็นแอป (PWA):** manifest + ไอคอน + Service Worker (ไม่แคช /api) — ปุ่ม "ติดตั้งแอป" ที่แถบบน
- **Schema ที่เพิ่ม (db push ทำให้เองตอน build, ไม่ลบข้อมูล):** Post.contactType/contactUrl, Popup.images (title/body มีค่าเริ่มต้นว่าง), index Post(deletedAt, createdAt) — ดู `prisma/migration.sql` ถ้าต้องการรันเอง

## ข้อจำกัด Free Tier
- Render หลับหลังไม่มีคนใช้ ~15 นาที ครั้งแรกช้า 30–60 วินาที **ข้อมูลและรูปไม่หาย** (อยู่ที่ Supabase)
- Supabase: DB 500MB, Storage 1GB, Egress 5GB/เดือน — ระบบย่อรูปเป็น WebP ≤1600px, cache รูป 1 ปี, ไม่ดึง count แยก, Popup/กฎ cache 30 วินาที, แชทตรวจทุก 8–60 วินาทีเฉพาะตอนจำเป็น
- โปรเจกต์ Supabase ฟรีจะถูก pause ถ้าไม่มีการใช้งาน 7 วัน (กด Restore ได้ ข้อมูลยังอยู่)
- `npm run build` ใช้ `prisma db push` แบบไม่มี `--accept-data-loss` — ถ้า schema จะทำให้ข้อมูลหาย build จะหยุดแทนการลบ
- การลบระบบสถานะ "เจอของแล้ว/ยังไม่เจอ" ทำผ่านสคริปต์ `prisma/drop-legacy.js` (รันอัตโนมัติก่อน db push ตอน build, รันซ้ำได้ปลอดภัย)
- รูปเก่าที่เคยอยู่ในโฟลเดอร์ `uploads/` ของ Render หายไปแล้ว (ระบบจะไม่แสดงรูปเสีย)
