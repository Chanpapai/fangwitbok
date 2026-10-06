const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { hashPassword } = require("../utils/password");

const router = express.Router();

// ป้องกันหน้านี้ด้วยค่าลับจาก Environment Variable เท่านั้น (ไม่ใช่รหัสผ่านที่เดาง่าย)
// ต้องตั้งค่า SETUP_SECRET ไว้ตอน deploy แล้วเปิดลิงก์พร้อม ?token=ค่านั้น
function checkToken(req, res) {
  const expected = process.env.SETUP_SECRET;
  if (!expected) {
    res.status(500).send("เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า SETUP_SECRET");
    return false;
  }
  if (req.query.token !== expected && req.body?.token !== expected) {
    res.status(403).send("ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว");
    return false;
  }
  return true;
}

function page(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ตั้งค่าเริ่มต้น FangwitBok</title>
<style>
  body{font-family:system-ui,sans-serif;background:#f0f5ff;margin:0;padding:24px;display:flex;justify-content:center;}
  .card{background:#fff;border-radius:16px;padding:24px;max-width:360px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.08);}
  h1{font-size:18px;margin:0 0 16px;}
  input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ddd;border-radius:10px;margin-bottom:10px;font-size:14px;}
  button{width:100%;padding:12px;border:none;border-radius:999px;background:linear-gradient(90deg,#60a5fa,#6d5df6);color:#fff;font-weight:700;font-size:14px;}
  p{font-size:13px;color:#555;line-height:1.5;}
</style></head>
<body><div class="card">${bodyHtml}</div></body></html>`;
}

// GET /api/setup?token=... — แสดงฟอร์มสร้าง Super Admin คนแรก (เปิดผ่านเบราว์เซอร์ล้วน ๆ ไม่ต้องใช้ terminal)
router.get("/", async (req, res) => {
  if (!checkToken(req, res)) return;

  const existing = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (existing > 0) {
    return res.send(page("<h1>ตั้งค่าเสร็จเรียบร้อยแล้ว</h1><p>มี Super Admin อยู่ในระบบแล้ว หน้านี้ใช้งานได้ครั้งเดียวเท่านั้นเพื่อความปลอดภัย</p>"));
  }

  res.send(
    page(`
      <h1>สร้างบัญชี Super Admin คนแรก</h1>
      <form method="POST" action="/api/setup?token=${encodeURIComponent(req.query.token)}">
        <input name="displayName" placeholder="ชื่อจริง (ใช้เข้าสู่ระบบ)" required maxlength="50" />
        <input name="password" type="password" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเลข)" required minlength="8" maxlength="72" />
        <button type="submit">สร้างบัญชี</button>
      </form>
      <p>หน้านี้จะใช้งานไม่ได้อีกทันทีหลังสร้างบัญชีสำเร็จ 1 ครั้ง</p>
    `)
  );
});

const setupSchema = z.object({
  password: z.string().min(8).max(72).regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
  displayName: z.string().trim().min(1).max(50),
});

// POST /api/setup?token=... — รับข้อมูลจากฟอร์มด้านบน สร้าง Super Admin จริง
router.post("/", express.urlencoded({ extended: false }), async (req, res) => {
  if (!checkToken(req, res)) return;

  const existing = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
  if (existing > 0) {
    return res.status(400).send(page("<h1>ทำไปแล้ว</h1><p>มี Super Admin อยู่แล้ว ไม่สามารถสร้างซ้ำผ่านหน้านี้ได้</p>"));
  }

  const parsed = setupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).send(page(`<h1>ข้อมูลไม่ถูกต้อง</h1><p>${Object.values(parsed.error.flatten().fieldErrors).flat().join(", ")}</p><a href="javascript:history.back()">← กลับไปกรอกใหม่</a>`));
  }

  const { password, displayName } = parsed.data;
  const studentCode = `staff-${crypto.randomBytes(6).toString("hex")}`; // ค่าภายใน ไม่ใช้เข้าสู่ระบบ

  const passwordHash = await hashPassword(password);
  await prisma.user.create({ data: { studentCode, passwordHash, displayName, role: "SUPER_ADMIN" } });

  res.send(
    page(`
      <h1>สร้างบัญชีสำเร็จ!</h1>
      <p>เข้าสู่ระบบที่หน้าเว็บ FangwitBok ด้วย "ชื่อจริง" ที่เพิ่งกรอก และรหัสผ่านที่เพิ่งตั้งได้เลย</p>
      <p>หน้านี้ใช้งานไม่ได้อีกแล้ว แนะนำให้ลบค่า SETUP_SECRET ออกจากการตั้งค่าเซิร์ฟเวอร์เพื่อความปลอดภัย</p>
    `)
  );
});

module.exports = router;
