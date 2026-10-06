const crypto = require("crypto");
const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { logAudit } = require("../utils/audit");
const { hashPassword } = require("../utils/password");

const router = express.Router();

router.use(requireAuth);

const STAFF_ROLES = ["ADMIN", "SUPER_ADMIN"];

// GET /api/admin/users — รายชื่อทีมงาน (ดูได้ตั้งแต่ระดับ Admin ขึ้นไป)
router.get("/users", requireRole("ADMIN"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 30;
  const users = await prisma.user.findMany({
    where: { role: { in: STAFF_ROLES } },
    select: {
      id: true, displayName: true, role: true,
      isBanned: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  res.json({ users, page });
});

const createAdminSchema = z.object({
  password: z.string().min(8).max(72).regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
  displayName: z.string().trim().min(1, "กรุณากรอกชื่อจริง").max(50), // ใช้เป็นชื่อสำหรับเข้าสู่ระบบ
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

// POST /api/admin/users — Super Admin สร้างบัญชีทีมผู้ดูแล (ผู้เข้าชมทั่วไปไม่มีบัญชี)
router.post("/users", requireRole("SUPER_ADMIN"), validateBody(createAdminSchema), async (req, res) => {
  const { password, displayName, role } = req.body;
  // ชื่อต้องไม่ซ้ำกับทีมงานคนอื่น (ใช้เป็นชื่อเข้าสู่ระบบ)
  const dup = await prisma.user.findFirst({
    where: { displayName: { equals: displayName, mode: "insensitive" }, role: { in: STAFF_ROLES } },
    select: { id: true },
  });
  if (dup) return res.status(409).json({ error: "มีทีมงานใช้ชื่อนี้แล้ว กรุณาใช้ชื่ออื่น" });
  // คอลัมน์ studentCode ยังเป็น unique/required ในฐานข้อมูล จึงสร้างค่าภายในให้อัตโนมัติ (ไม่แสดง ไม่ใช้เข้าสู่ระบบ)
  const studentCode = `staff-${crypto.randomBytes(6).toString("hex")}`;
  const user = await prisma.user.create({ data: { studentCode, displayName, role, passwordHash: await hashPassword(password) } });
  await logAudit({ actorId: req.user.id, action: "ADMIN_CREATE", targetType: "USER", targetId: user.id, metadata: { role }, ipAddress: req.ip });
  res.status(201).json({ user: { id: user.id, displayName: user.displayName, role: user.role } });
});

const roleChangeSchema = z.object({ role: z.enum(["USER", "ADMIN", "SUPER_ADMIN"]) });

// POST /api/admin/users/:userId/role — เฉพาะ Super Admin เท่านั้นที่แต่งตั้ง/ถอด Admin ได้
router.post(
  "/users/:userId/role",
  requireRole("SUPER_ADMIN"),
  validateBody(roleChangeSchema),
  async (req, res) => {
    const { userId } = req.params;
    const { role: toRole } = req.body;

    // กันยกระดับ/ลดสิทธิ์ตัวเอง — ต้องให้ Super Admin คนอื่นเป็นผู้เปลี่ยนแทนเสมอ
    if (userId === req.user.id) {
      return res.status(400).json({ error: "ไม่สามารถเปลี่ยนสิทธิ์ของตัวเองได้" });
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return res.status(404).json({ error: "ไม่พบผู้ใช้" });

    // กันไม่ให้ระบบเหลือ Super Admin 0 คน (ล็อกตัวเองออกจากระบบถาวร)
    if (target.role === "SUPER_ADMIN" && toRole !== "SUPER_ADMIN") {
      const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
      if (superAdminCount <= 1) {
        return res.status(400).json({ error: "ต้องมี Super Admin อย่างน้อย 1 คนในระบบเสมอ" });
      }
    }

    const fromRole = target.role;
    const updated = await prisma.user.update({ where: { id: userId }, data: { role: toRole } });
    // ถอดสิทธิ์ทีมงาน (เป็น USER): ยกเลิกทุกเซสชันที่ล็อกอินค้างอยู่ทันที (สิทธิ์จริงถูกตรวจจาก DB ทุกคำขออยู่แล้ว)
    if (toRole === "USER") {
      await prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    }

    await prisma.roleChangeLog.create({
      data: { targetUserId: userId, fromRole, toRole, changedById: req.user.id },
    });
    await logAudit({
      actorId: req.user.id,
      action: "ROLE_CHANGE",
      targetType: "USER",
      targetId: userId,
      metadata: { fromRole, toRole },
      ipAddress: req.ip,
    });

    res.json({ user: { id: updated.id, role: updated.role } });
  }
);

// POST /api/admin/users/:userId/ban — ระงับ/ปลดระงับบัญชี (Admin ขึ้นไป)
router.post("/users/:userId/ban", requireRole("ADMIN"), async (req, res) => {
  const { userId } = req.params;
  const { banned, reason } = req.body;

  if (userId === req.user.id) return res.status(400).json({ error: "ไม่สามารถระงับบัญชีตัวเองได้" });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  // Admin ทั่วไปแบน Admin/Super Admin คนอื่นไม่ได้ ป้องกันการรังแกกันเองในทีมผู้ดูแล
  if (target.role !== "USER" && req.user.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "ต้องเป็น Super Admin เท่านั้นที่ระงับบัญชีแอดมินได้" });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isBanned: !!banned, bannedReason: banned ? String(reason || "").slice(0, 300) : null },
  });

  await logAudit({
    actorId: req.user.id,
    action: banned ? "USER_BAN" : "USER_UNBAN",
    targetType: "USER",
    targetId: userId,
    metadata: { reason: reason || null },
    ipAddress: req.ip,
  });

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs — ดูประวัติการกระทำของ Admin/Super Admin ทั้งหมด
// (อ่านอย่างเดียว เป็น append-only log ไม่มี endpoint แก้ไข/ลบใด ๆ)
// ---------------------------------------------------------------------------
router.get("/audit-logs", requireRole("ADMIN"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 50;
  const where = {
    ...(req.query.targetType ? { targetType: req.query.targetType } : {}),
    ...(req.query.actorId ? { actorId: req.query.actorId } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    include: { actor: { select: { displayName: true, role: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  res.json({ logs, page });
});

module.exports = router;
