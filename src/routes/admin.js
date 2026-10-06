const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { logAudit } = require("../utils/audit");
const { hashPassword } = require("../utils/password");
const crypto = require("crypto");

const router = express.Router();

router.use(requireAuth);

// GET /api/admin/users — รายชื่อผู้ใช้ (ดูได้ตั้งแต่ระดับ Admin ขึ้นไป)
router.get("/users", requireRole("ADMIN"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 30;
  const users = await prisma.user.findMany({
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

// ชื่อทีมงาน (ใช้ล็อกอิน) ห้ามซ้ำกันแบบไม่สนตัวพิมพ์
const staffNameTaken = (name, exceptId) =>
  prisma.user.findFirst({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      displayName: { equals: name, mode: "insensitive" },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { id: true },
  });

const createAdminSchema = z.object({
  displayName: z.string().trim().min(2, "กรุณากรอกชื่อจริง").max(50),
  password: z.string().min(8).max(72).regex(/[0-9]/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว"),
  role: z.enum(["ADMIN", "SUPER_ADMIN"]).default("ADMIN"),
});

// POST /api/admin/users — Super Admin สร้างบัญชีทีมงาน: ใช้ "ชื่อจริง + รหัสผ่าน" (ไม่มีรหัสผู้ดูแลแยกแล้ว)
router.post("/users", requireRole("SUPER_ADMIN"), validateBody(createAdminSchema), async (req, res) => {
  const { displayName, password, role } = req.body;
  if (await staffNameTaken(displayName)) return res.status(409).json({ error: "มีทีมงานชื่อนี้อยู่แล้ว กรุณาใช้ชื่ออื่น (ชื่อใช้ล็อกอินจึงซ้ำกันไม่ได้)" });
  // คอลัมน์ studentCode ยังต้องมีค่าไม่ซ้ำตามโครงสร้างเดิม — ระบบสร้างค่าสุ่มภายใน ไม่แสดงและไม่ใช้ล็อกอิน
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

    // แต่งตั้งเป็นทีมงาน: ชื่อต้องไม่ซ้ำกับทีมงานคนอื่น (ใช้ล็อกอิน)
    if (toRole !== "USER" && target.role === "USER" && (await staffNameTaken(target.displayName, target.id))) {
      return res.status(409).json({ error: "มีทีมงานชื่อเดียวกันอยู่แล้ว กรุณาให้ใช้ชื่ออื่นก่อนแต่งตั้ง" });
    }

    const fromRole = target.role;
    const updated = await prisma.user.update({ where: { id: userId }, data: { role: toRole } });

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

// POST /api/admin/users/:userId/remove-admin — "ถอดออกจาก Admin": เฉพาะ Super Admin (ตรวจที่ Backend ไม่ใช่แค่ซ่อนปุ่ม)
// ลดเป็นสมาชิกทั่วไป + เพิกถอนเซสชันที่ล็อกอินค้างอยู่ทันที + บันทึก Audit/RoleChange
router.post("/users/:userId/remove-admin", requireRole("SUPER_ADMIN"), async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: "ไม่สามารถถอดสิทธิ์ของตัวเองได้" });

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "ไม่พบผู้ใช้" });
  if (target.role === "USER") return res.status(400).json({ error: "บัญชีนี้ไม่ได้เป็นทีมงานอยู่แล้ว" });

  if (target.role === "SUPER_ADMIN") {
    const superAdminCount = await prisma.user.count({ where: { role: "SUPER_ADMIN" } });
    if (superAdminCount <= 1) return res.status(400).json({ error: "ต้องมี Super Admin อย่างน้อย 1 คนในระบบเสมอ" });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { role: "USER" } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    prisma.roleChangeLog.create({ data: { targetUserId: userId, fromRole: target.role, toRole: "USER", changedById: req.user.id } }),
  ]);
  await logAudit({
    actorId: req.user.id, action: "ADMIN_REMOVE", targetType: "USER", targetId: userId,
    metadata: { fromRole: target.role, name: target.displayName }, ipAddress: req.ip,
  });
  res.json({ ok: true });
});

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
