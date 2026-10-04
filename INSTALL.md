# คู่มือติดตั้ง FangwitBok V2 — แบบไม่ต้องติดตั้งอะไรในเครื่องเลย

คู่มือนี้ทำทุกอย่าง **ผ่านเว็บเบราว์เซอร์ล้วน ๆ** ไม่ต้องลง Node.js, ไม่ต้องลง PostgreSQL,
ไม่ต้องเปิด Terminal/Command Line เลยสักขั้นตอน (เหมาะกับ Chromebook/มือถือ/เครื่องที่ติดตั้ง
โปรแกรมอะไรเพิ่มไม่ได้)

ใช้บริการฟรี 3 ตัว:
- **Neon** — ฐานข้อมูล PostgreSQL ฟรี (สร้างผ่านเว็บ)
- **Render** — รัน Backend API ฟรี (ดึงโค้ดจาก GitHub มา build ให้เอง)
- **Vercel** — รัน หน้าเว็บ Frontend ฟรี (เหมือนที่เคยใช้กับเว็บ Happy Birthday)

---

## ขั้นที่ 1: สร้างฐานข้อมูลฟรีที่ Neon

1. ไปที่ [neon.tech](https://neon.tech) → สมัคร/ล็อกอิน (ใช้ GitHub ล็อกอินได้เลย)
2. กด **Create a project** ตั้งชื่ออะไรก็ได้ เช่น `fangwitbok`
3. หน้า Dashboard จะมีกล่อง **Connection string** ขึ้นต้นด้วย `postgresql://...`
   กดปุ่ม copy เก็บไว้ — **นี่คือค่าที่ต้องใช้เป็น `DATABASE_URL` ในขั้นต่อไป**

---

## ขั้นที่ 1.5: สร้างที่เก็บรูปถาวรที่ Supabase Storage

รูปที่อัปโหลดต้องไม่หายเมื่อ deploy ใหม่ จึงใช้ Supabase เฉพาะส่วน Storage (ไม่ใช้ Auth/Database)

1. ไปที่ [supabase.com](https://supabase.com) → สร้างโปรเจกต์ใหม่ฟรี (รอ 1-2 นาทีให้พร้อม)
2. เมนูซ้าย **Storage** → **New bucket** → ตั้งชื่อ `fangwitbok-uploads` → ติ๊ก **Public bucket** → Create
3. เมนูซ้าย **Settings → API** → copy ค่า **Project URL** และ **service_role key** (แถว secret
   ไม่ใช่ anon) เก็บไว้ — ใช้เป็น `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ในขั้นถัดไป
   ⚠️ ค่านี้ใส่ใน Backend (Render) เท่านั้น ห้ามใส่ในหน้าเว็บ Frontend เด็ดขาด

## ขั้นที่ 2: อัปโหลดโค้ดขึ้น GitHub

1. ไปที่ [github.com](https://github.com) → ล็อกอิน → **New repository** ตั้งชื่อ เช่น `fangwitbok`
   (private ก็ได้) → **Create repository**
2. แตกไฟล์ zip ที่ได้รับในเครื่อง (เปิดแอป Files บน Chromebook/มือถือ ดับเบิลแตะไฟล์ zip)
3. ในหน้า GitHub repo กด **Add file → Upload files**
4. ลากทุกไฟล์/โฟลเดอร์ที่อยู่ **ข้างใน** โฟลเดอร์ `fangwitbok` (ไม่ใช่ตัวโฟลเดอร์ `fangwitbok` เอง)
   ไปวางในกล่องอัปโหลด — ต้องเห็น `package.json`, `src/`, `prisma/`, `frontend/` ที่หน้าแรกของ repo
5. กด **Commit changes**

---

## ขั้นที่ 3: Deploy Backend ที่ Render

1. ไปที่ [render.com](https://render.com) → สมัคร/ล็อกอินด้วย GitHub
2. กด **New +** → **Web Service** → เลือก repo `fangwitbok` ที่เพิ่งอัปโหลด
3. ตั้งค่าตามนี้:
   - **Name:** อะไรก็ได้ เช่น `fangwitbok-api`
   - **Root Directory:** เว้นว่างไว้ (backend อยู่ที่ root ของ repo)
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. เลื่อนลงหา **Environment Variables** กด **Add Environment Variable** ใส่ทีละตัว:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | connection string จาก Neon (ขั้นที่ 1) |
   | `JWT_ACCESS_SECRET` | กดปุ่ม **Generate** ข้าง ๆ ช่อง (Render สุ่มให้อัตโนมัติ) |
   | `JWT_REFRESH_SECRET` | กด **Generate** อีกครั้ง (ต้องได้ค่าไม่ซ้ำกับตัวบน) |
   | `SETUP_SECRET` | กด **Generate** อีกครั้ง |
   | `CORS_ORIGIN` | ใส่ `http://localhost:5173` ไปก่อน (จะกลับมาแก้เป็น URL จริงในขั้นที่ 5) |
   | `SUPABASE_URL` | จากขั้นที่ 1.5 |
   | `SUPABASE_SERVICE_ROLE_KEY` | จากขั้นที่ 1.5 (ค่า secret ห้ามเปิดเผย) |
   | `SUPABASE_BUCKET` | `fangwitbok-uploads` |
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |

5. กด **Create Web Service** รอ 2-5 นาทีให้ build เสร็จ (ดู log ได้ที่หน้าจอ ถ้าขึ้น "Live"
   สีเขียวแปลว่าสำเร็จ)
6. จดลิงก์ของ Backend ไว้ หน้าตาแบบ `https://fangwitbok-api-xxxx.onrender.com`
7. ทดสอบเปิดลิงก์ `https://fangwitbok-api-xxxx.onrender.com/api/health` ต้องเห็น `{"ok":true}`

> **ฟรีแต่มีข้อจำกัด:** Render แผนฟรีจะ "หลับ" ถ้าไม่มีคนใช้งาน 15 นาที (เปิดครั้งแรกหลังหลับ
> จะช้าประมาณ 30-60 วินาที) ส่วนรูปภาพไม่ต้องกังวล — เก็บไว้ที่ Supabase Storage แยกต่างหาก
> (ขั้นที่ 1.5) จึง **ไม่หายแม้ deploy ใหม่หรือ Render จะหลับ/รีสตาร์ท**

---

## ขั้นที่ 4: สร้างบัญชี Super Admin ผ่านเบราว์เซอร์ (ไม่ใช้ Terminal)

1. ไปที่หน้า Render ของ service คุณ → แท็บ **Environment** → หาค่า `SETUP_SECRET` ที่สุ่มไว้
   กด copy
2. เปิดแท็บใหม่ พิมพ์ลิงก์นี้ (แทนที่ 2 ส่วน):
   ```
   https://fangwitbok-api-xxxx.onrender.com/api/setup?token=ค่า-SETUP_SECRET-ที่-copy-มา
   ```
3. จะเห็นฟอร์มง่าย ๆ ให้กรอก รหัสนักเรียน/ชื่อที่แสดง/รหัสผ่าน → กด **สร้างบัญชี**
4. เมื่อขึ้น "✅ สร้างบัญชีสำเร็จ" ให้จด รหัสนักเรียน + รหัสผ่าน ไว้ใช้ล็อกอินเป็นแอดมินทีหลัง
5. **หน้านี้จะใช้งานไม่ได้อีกเลยหลังจากนี้** (ล็อกตัวเองอัตโนมัติ) เพื่อความปลอดภัย

---

## ขั้นที่ 5: Deploy Frontend ที่ Vercel

1. ไปที่ [vercel.com](https://vercel.com) → ล็อกอินด้วย GitHub
2. **Add New... → Project** → เลือก repo `fangwitbok` เดียวกัน
3. ในหน้า Configure Project:
   - **Root Directory:** กด Edit → เลือก `frontend`
   - Framework จะขึ้น **Vite** ให้อัตโนมัติ
4. เปิด **Environment Variables** ใส่:
   - Key: `VITE_API_URL` → Value: ลิงก์ Backend จาก Render (ขั้นที่ 3 ข้อ 6) เช่น
     `https://fangwitbok-api-xxxx.onrender.com`
5. กด **Deploy** รอ 1-2 นาที จะได้ลิงก์หน้าเว็บ เช่น `https://fangwitbok-xxxx.vercel.app`

---

## ขั้นที่ 6: เชื่อม Backend กับ Frontend ให้ถูกต้อง (สำคัญ ห้ามข้าม)

ตอนนี้ Backend ยังอนุญาตแค่ `http://localhost:5173` (ที่ใส่ไว้ชั่วคราวในขั้นที่ 3) ต้องกลับไปแก้:

1. กลับไปที่ Render → service ของคุณ → แท็บ **Environment**
2. แก้ค่า `CORS_ORIGIN` เป็นลิงก์ Vercel จริงจากขั้นที่ 5 เช่น `https://fangwitbok-xxxx.vercel.app`
   (ห้ามมี `/` ปิดท้าย)
3. กด **Save Changes** — Render จะ redeploy backend ให้อัตโนมัติ รอจนขึ้น "Live" อีกครั้ง

---

## ขั้นที่ 7: ทดสอบใช้งานจริง

1. เปิดลิงก์ Vercel ของคุณ (`https://fangwitbok-xxxx.vercel.app`)
2. กด **สมัครสมาชิก** สร้างบัญชีทดสอบ 1 บัญชี → ลองโพสต์ฝากบอก/ตามหาของหาย แนบรูป กดใจ คอมเมนต์
3. ออกจากระบบ → ล็อกอินด้วยบัญชี Super Admin จากขั้นที่ 4
4. กดปุ่ม **🛠️ Admin** มุมขวาบน → ลองดูทุกแท็บ (รายงาน, Trash, Popup, ผู้ใช้, Audit Log)
5. ลบโพสต์ทดสอบ → เช็คว่าไปอยู่ในแท็บ Trash → กด "กู้คืน" → กลับไปเช็คที่ฟีด

ถ้าทำได้ครบ = ระบบพร้อมใช้งานจริงแล้ว ทั้งหมดนี้ไม่ต้องติดตั้งอะไรในเครื่องเลยสักขั้นตอน

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| Render build ล้มเหลว (Failed) | กดดู **Logs** ในหน้า Render อ่านบรรทัดสีแดงท้ายสุด ส่งภาพมาดูได้ |
| หน้าเว็บ Vercel ขึ้น Network Error | เช็คว่า `VITE_API_URL` ตรงกับลิงก์ Render เป๊ะ และ `CORS_ORIGIN` ใน Render ตรงกับลิงก์ Vercel เป๊ะ (ขั้นที่ 6) |
| เปิดหน้าเว็บครั้งแรกช้ามาก (ค้าง 30-60 วิ) | ปกติของ Render แผนฟรีที่ "หลับ" ไปตอนไม่มีคนใช้ รอสักครู่จะกลับมาใช้ได้ |
| หน้า `/api/setup` ขึ้น "ลิงก์นี้ไม่ถูกต้อง" | token ใน URL ต้องตรงกับค่า `SETUP_SECRET` ใน Render เป๊ะ เช็คว่า copy มาครบไม่มีช่องว่างเกิน |
| หน้า `/api/setup` ขึ้น "ตั้งค่าเสร็จเรียบร้อยแล้ว" | มี Super Admin ในระบบแล้ว ใช้งานซ้ำไม่ได้ (ตั้งใจให้เป็นแบบนั้นเพื่อความปลอดภัย) |
| รูปไม่แสดง/อัปโหลดไม่ได้ | เช็คว่าตั้งค่า `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` ถูกต้อง และ bucket `fangwitbok-uploads` ติ๊ก Public ไว้จริง (ขั้นที่ 1.5) |

---

## อยากปรับแก้โค้ดทีหลัง ทำยังไง (ไม่ต้องติดตั้งอะไรเพิ่ม)

1. ไปแก้ไฟล์ในหน้าเว็บ GitHub โดยตรง (ไอคอนดินสอ) หรือลบไฟล์เก่าแล้วอัปโหลดไฟล์ใหม่ทับ
2. กด Commit changes
3. Render และ Vercel จะ build เวอร์ชันใหม่ให้อัตโนมัติทุกครั้งที่มีการ commit — ไม่ต้องกดอะไรเพิ่ม
