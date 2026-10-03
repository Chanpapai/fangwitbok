const express = require("express");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

// GET /api/admin/notifications — Notification Center ของแอดมิน (แจ้งเตือนกว้าง + เฉพาะตัว)
router.get("/admin/notifications", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { OR: [{ recipientId: null }, { recipientId: req.user.id }] },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = items.filter((n) => !n.isRead).length;
  res.json({ notifications: items, unreadCount });
});

// POST /api/admin/notifications/:id/read
router.post("/admin/notifications/:id/read", requireAuth, requireRole("ADMIN"), async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, OR: [{ recipientId: null }, { recipientId: req.user.id }] },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

// GET /api/notifications — การแจ้งเตือนส่วนตัวของผู้ใช้ทั่วไป (เช่น โพสต์ถูกลบ/รายงานได้รับการตอบกลับ ในอนาคต)
router.get("/notifications", requireAuth, async (req, res) => {
  const items = await prisma.notification.findMany({
    where: { recipientId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ notifications: items });
});

module.exports = router;
