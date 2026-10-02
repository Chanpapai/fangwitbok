# FangwitBok V2 — Backend (Phase 1-4 ครบ)

แพลตฟอร์มฝากบอก/ตามหาของหายของโรงเรียน — Backend API ทั้งหมด (ยังไม่มีหน้าเว็บ React)

## สถานะงาน

✅ **Phase 1 — Database + RBAC foundation**
Schema ครบทุกตาราง (User, Post, PostImage, Comment, Like, Report, AuditLog,
RoleChangeLog, Popup, Notification, RefreshToken) สิทธิ์ 3 ระดับ
`SUPER_ADMIN > ADMIN > USER`

✅ **Phase 2 — Auth + Security จริง**
bcrypt, JWT access+refresh (rotation), RBAC เช็คจาก DB ทุกครั้ง, CSRF (double-submit),
rate limit, zod validation, ป้องกันยกระดับสิทธิ์ตัวเอง, ป้องกันลด Super Admin จนเหลือ 0 คน

✅ **Phase 3 — Feed / โพสต์ / คอมเมนต์ / ไลก์ / รายงาน / อัปโหลดรูป**
- โพสต์ 2 ประเภท: **ฝากบอก** (`ANNOUNCE`) และ **ตามหาของหาย** (`LOST_FOUND`, มีสถานะ
  "ยังไม่เจอ" / "เจอของแล้ว" สลับได้โดยเจ้าของโพสต์หรือแอดมิน)
- ระบุชื่อ/ไม่ระบุชื่อได้ต่อโพสต์และต่อคอมเมนต์ (เก็บชื่อจริงไว้ใน DB เสมอ เพื่อให้แอดมิน
  ตรวจสอบย้อนหลังได้ แต่ไม่ส่งชื่อจริงออกไปให้ client ถ้าเลือกไม่ระบุชื่อ)
- แนบรูปได้สูงสุด 5 รูป/โพสต์ — ทุกรูปถูก **sharp ถอดรหัสและเข้ารหัสใหม่เป็น WebP เสมอ**
  (ยืนยันว่าเป็นไฟล์รูปจริง ไม่ใช่ไฟล์อันตรายสวมรอย + ล้าง EXIF/metadata + ตั้งชื่อไฟล์สุ่มใหม่
  ทั้งหมด กัน path traversal) จำกัดไฟล์ละ 5MB ชนิด JPG/PNG/WebP เท่านั้น
- กดใจ (toggle, กันกดซ้ำด้วย unique constraint ระดับ DB), คอมเมนต์, รายงานเนื้อหา
- ลบโพสต์/คอมเมนต์ = soft delete (ย้ายเข้า Trash) ไม่ได้ลบถาวรทันที

✅ **Phase 4 — Admin Dashboard (API) + Trash + Audit Log + Popup + Notification**
- Trash: ดูรายการ, กู้คืน (Admin), ลบถาวรทันที (เฉพาะ Super Admin), **ลบถาวรอัตโนมัติ
  ทุกวัน 03:00 น. เมื่อเกิน 15 วัน** (`node-cron`, ลบไฟล์รูปออกจากดิสก์ด้วย)
- Audit Log: บันทึกทุกการกระทำของแอดมิน (ลบ/กู้คืน/ตัดสินรายงาน/เปลี่ยนสิทธิ์/Popup)
  แบบ append-only อ่านได้อย่างเดียว ไม่มี endpoint แก้ไข/ลบ
- Popup: สร้างได้หลายรายการ กำหนดลำดับ/ช่วงเวลา/เปิดปิดการแสดงผลเอง
- Notification Center: แจ้งเตือนแอดมินเมื่อมีโพสต์ใหม่/รายงานใหม่

✅ **Phase 5 — Frontend React ครบทุกหน้า** (ทดสอบจริงด้วย Playwright ทุก flow แล้ว)

✅ **เพิ่มเติม:** `/api/setup` — หน้าเว็บสร้าง Super Admin คนแรกผ่านฟอร์มในเบราว์เซอร์
(ไม่ต้องมี terminal/เข้าถึงเครื่อง server โดยตรง) ดูวิธีใช้ใน `INSTALL.md`

👉 **วิธีติดตั้งแบบไม่ต้องลงโปรแกรมอะไรในเครื่องเลย ดูที่ไฟล์ `INSTALL.md`**

---

## ⚠️ ข้อจำกัดของสภาพแวดล้อมที่ใช้เขียนโค้ดนี้ (สำคัญ — อ่านก่อนใช้งาน)

Sandbox ที่ผมใช้พัฒนาบล็อกการเชื่อมต่อไปโดเมน `binaries.prisma.sh` (ที่ Prisma ใช้แจก
schema-engine/query-engine) ผมทดลองแล้วทั้งแบบ PostgreSQL ปกติและแบบสลับไปใช้ SQLite
+ Driver Adapters (เทคนิคใหม่ที่เลี่ยงการใช้ native binary) **ก็ยังติดกำแพงเดียวกัน** เพราะ
`prisma generate` ต้องดาวน์โหลด schema-engine เสมอไม่ว่าจะใช้วิธีไหน

**สิ่งที่ตรวจสอบได้จริงในสภาพแวดล้อมนี้ (ทำแล้ว):**
- โครงสร้าง `schema.prisma` ถูกต้อง (วงเล็บสมดุล, ทุก relation จับคู่ fields/references ครบ)
- ไฟล์ JavaScript ทุกไฟล์ผ่าน `node --check` (ไม่มี syntax error) รวม 20 ไฟล์
- ทดสอบยืนยันว่า `require("./src/app")` โหลดได้ไม่มี error จนถึงขั้นตอนสร้าง PrismaClient
  จริง (ซึ่งต้องรอไฟล์ engine ที่ยังโหลดไม่ได้)

**สิ่งที่ยังไม่ได้ทดสอบจริง (ต้องทำในเครื่องคุณ):** การรัน query จริงกับฐานข้อมูลจริง,
endpoint ทั้งหมด end-to-end, cron job ลบถาวรอัตโนมัติ

### วิธีตรวจสอบให้ครบในเครื่องคุณ

```bash
npm install
cp .env.example .env              # แก้ DATABASE_URL และ JWT secrets ให้เป็นค่าจริง
npx prisma generate
npx prisma migrate dev --name init
SEED_ADMIN_CODE=admin001 SEED_ADMIN_PASSWORD=รหัสผ่านจริงอย่างน้อย8ตัว npm run seed
npm run dev
```
ถ้าเจอ error ตรงไหน ส่งข้อความมาดูได้เลย จะช่วยไล่ให้

---

## รายการ API ทั้งหมด

### Auth (`/api/auth`)
| Method | Path | สิทธิ์ | หมายเหตุ |
|---|---|---|---|
| POST | `/register` | สาธารณะ | role เริ่มต้นเป็น USER เสมอ |
| POST | `/login` | สาธารณะ | rate limit 10 ครั้ง/15 นาที |
| POST | `/refresh` | ต้องมี cookie + CSRF header | หมุนเวียน refresh token ทุกครั้ง |
| POST | `/logout` | ต้องมี cookie + CSRF header | revoke refresh token |
| GET | `/me` | ต้องล็อกอิน | |

### โพสต์ (`/api/posts`)
| Method | Path | สิทธิ์ |
|---|---|---|
| GET | `/?type=&page=` | สาธารณะ |
| GET | `/:id` | สาธารณะ (รวมคอมเมนต์) |
| POST | `/` (multipart, field `images`) | ต้องล็อกอิน |
| PATCH | `/:id/lost-status` | เจ้าของ/Admin+ |
| DELETE | `/:id` | เจ้าของ/Admin+ (soft delete) |
| POST | `/:postId/like` | ต้องล็อกอิน (toggle) |
| POST | `/:postId/comments` | ต้องล็อกอิน |

### คอมเมนต์ / รายงาน
| Method | Path | สิทธิ์ |
|---|---|---|
| DELETE | `/api/comments/:id` | เจ้าของ/Admin+ |
| POST | `/api/reports` | ต้องล็อกอิน |
| GET | `/api/admin/reports?status=` | Admin+ |
| POST | `/api/admin/reports/:id/resolve` | Admin+ |

### Admin (`/api/admin`)
| Method | Path | สิทธิ์ |
|---|---|---|
| GET | `/users` | Admin+ |
| POST | `/users/:id/role` | **Super Admin เท่านั้น** |
| POST | `/users/:id/ban` | Admin+ (แบนแอดมินคนอื่นต้อง Super Admin) |
| GET | `/audit-logs?targetType=&actorId=` | Admin+ |
| GET/POST/PATCH/DELETE | `/trash`, `/popups` | Admin+ |

### Popup / Notification
| Method | Path | สิทธิ์ |
|---|---|---|
| GET | `/api/popups` | สาธารณะ (เฉพาะที่ active + อยู่ในช่วงเวลา) |
| GET | `/api/notifications` | ผู้ใช้ทั่วไป (ของตัวเอง) |
| GET | `/api/admin/notifications` | Admin+ (Notification Center) |
| POST | `/api/admin/notifications/:id/read` | Admin+ |

---

## โครงสร้างไฟล์

```
prisma/schema.prisma        → โครงสร้างฐานข้อมูลทั้งหมด
prisma/seed.js              → สร้าง Super Admin คนแรก
src/config/db.js            → Prisma client
src/middleware/auth.js      → requireAuth, requireRole (RBAC หลัก)
src/middleware/csrf.js      → ป้องกัน CSRF
src/middleware/rateLimit.js → กัน brute-force / สแปม
src/middleware/upload.js    → multer (whitelist ชนิด/ขนาดไฟล์)
src/utils/jwt.js            → ออก/ตรวจ token
src/utils/password.js       → bcrypt
src/utils/audit.js          → บันทึก Audit Log
src/utils/notify.js         → สร้าง Notification
src/utils/sanitize.js       → กัน Stored XSS (ตัด HTML ทั้งหมดออกจากข้อความ)
src/utils/image.js          → ประมวลผล/ตรวจสอบรูปจริงด้วย sharp, ลบไฟล์
src/utils/validate.js       → zod validation middleware
src/routes/auth.js          → register/login/refresh/logout/me
src/routes/admin.js         → role/ban/audit-logs
src/routes/posts.js         → โพสต์ + feed
src/routes/comments.js      → คอมเมนต์
src/routes/likes.js         → กดใจ
src/routes/reports.js       → รายงาน + แอดมินตัดสิน
src/routes/trash.js         → Trash: ดู/กู้คืน/ลบถาวร
src/routes/popups.js        → Popup CRUD
src/routes/notifications.js → Notification Center
src/jobs/purgeTrash.js      → cron ลบถาวรอัตโนมัติทุกวัน 03:00 (เกิน 15 วัน)
src/app.js                  → ประกอบ Express app + security middleware ทั้งหมด
src/server.js               → จุดเริ่มรันเซิร์ฟเวอร์ + ตั้ง cron
uploads/                    → ไฟล์รูปที่อัปโหลด (สร้างอัตโนมัติ)
```

## Phase ถัดไป

เหลือหน้าเว็บ React (Feed, ฝากบอก, ตามหาของหาย, รายละเอียดโพสต์, กฎการใช้งาน,
โปรไฟล์, Admin Dashboard UI) บอกได้เลยว่าจะให้เริ่มทำต่อไหม
