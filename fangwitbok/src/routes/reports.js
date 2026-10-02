const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { writeLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");

const router = express.Router();

const createReportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500),
});

// POST /api/reports — ผู้ใช้ทั่วไปรายงานโพสต์/คอมเมนต์
router.post("/", requireAuth, writeLimiter, validateBody(createReportSchema), async (req, res) => {
  const { targetType, targetId, reason } = req.body;

  const exists =
    targetType === "POST"
      ? await prisma.post.findFirst({ where: { id: targetId, deletedAt: null } })
      : await prisma.comment.findFirst({ where: { id: targetId, deletedAt: null } });
  if (!exists) return res.status(404).json({ error: "ไม่พบเนื้อหาที่ต้องการรายงาน" });

  const report = await prisma.report.create({
    data: {
      targetType,
      postId: targetType === "POST" ? targetId : null,
      commentId: targetType === "COMMENT" ? targetId : null,
      reporterId: req.user.id,
      reason: sanitizeText(reason),
    },
  });

  notifyAdmins({
    type: "NEW_REPORT",
    title: "มีการรายงานเนื้อหาใหม่",
    body: reason.slice(0, 100),
    relatedType: "REPORT",
    relatedId: report.id,
  }).catch((e) => console.error("[notify] ล้มเหลว:", e.message));

  res.status(201).json({ ok: true, reportId: report.id });
});

// GET /api/admin/reports?status=PENDING — Admin ขึ้นไปเท่านั้น
router.get("/admin/reports", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const status = ["PENDING", "REVIEWED", "DISMISSED"].includes(req.query.status)
    ? req.query.status
    : "PENDING";

  const reports = await prisma.report.findMany({
    where: { status },
    include: {
      reporter: { select: { displayName: true, studentCode: true } },
      post: { select: { id: true, content: true, deletedAt: true } },
      comment: { select: { id: true, content: true, deletedAt: true, postId: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ reports });
});

const resolveSchema = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) });

// POST /api/admin/reports/:id/resolve — Admin ตัดสินรายงาน (ไม่ลบเนื้อหาอัตโนมัติ ต้องสั่งลบแยก)
router.post(
  "/admin/reports/:id/resolve",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(resolveSchema),
  async (req, res) => {
    const report = await prisma.report.findUnique({ where: { id: req.params.id } });
    if (!report) return res.status(404).json({ error: "ไม่พบรายงานนี้" });

    const updated = await prisma.report.update({
      where: { id: report.id },
      data: { status: req.body.status, reviewedById: req.user.id, reviewedAt: new Date() },
    });

    await logAudit({
      actorId: req.user.id,
      action: "REPORT_RESOLVE",
      targetType: "REPORT",
      targetId: report.id,
      metadata: { status: req.body.status, targetType: report.targetType },
      ipAddress: req.ip,
    });

    res.json({ report: updated });
  }
);

module.exports = router;
