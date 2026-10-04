const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { logAudit } = require("../utils/audit");

const router = express.Router();

router.use(requireAuth);

// GET /api/admin/users — รายชื่อผู้ใช้ (ดูได้ตั้งแต่ระดับ Admin ขึ้นไป)
router.get("/users", requireRole("ADMIN"), async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = 30;
  const users = await prisma.user.findMany({
    select: {
      id: true, studentCode: true, displayName: true, role: true,
      isBanned: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  res.json({ users, page });
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

    res.json({ user: { id: updated.id, studentCode: updated.studentCode, role: updated.role } });
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
    include: { actor: { select: { displayName: true, studentCode: true, role: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  res.json({ logs, page });
});

module.exports = router;
