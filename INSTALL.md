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
- เจ้าของโพสต์ = เครื่องที่โพสต์ (โทเคนในเบราว์เซอร์ ตรวจที่ Backend) ล้างข้อมูลเบราว์เซอร์ = เสียสิทธิ์แก้/ลบโพสต์นั้น

## ข้อจำกัด Free Tier
- Render หลับหลังไม่มีคนใช้ ~15 นาที ครั้งแรกช้า 30–60 วินาที **ข้อมูลและรูปไม่หาย** (อยู่ที่ Supabase)
- Supabase: DB 500MB, Storage 1GB, Egress 5GB/เดือน — ระบบย่อรูปเป็น WebP ≤1600px, cache รูป 1 ปี, ไม่ดึง count แยก, Popup/กฎ cache 30 วินาที, แชทตรวจทุก 8–60 วินาทีเฉพาะตอนจำเป็น
- โปรเจกต์ Supabase ฟรีจะถูก pause ถ้าไม่มีการใช้งาน 7 วัน (กด Restore ได้ ข้อมูลยังอยู่)
- `npm run build` ใช้ `prisma db push` แบบไม่มี `--accept-data-loss` — ถ้า schema จะทำให้ข้อมูลหาย build จะหยุดแทนการลบ
- รูปเก่าที่เคยอยู่ในโฟลเดอร์ `uploads/` ของ Render หายไปแล้ว (ระบบจะไม่แสดงรูปเสีย)
