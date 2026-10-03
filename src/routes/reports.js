const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { validateBody } = require("../utils/validate");
const { reportLimiter } = require("../middleware/rateLimit");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");
const { notifyAdmins } = require("../utils/notify");
const { hashIp } = require("../utils/guest");

const router = express.Router();

const createReportSchema = z.object({
  targetType: z.enum(["POST", "COMMENT"]),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500),
});

// POST /api/reports — ผู้เข้าชมทั่วไปรายงานเนื้อหาได้ ไม่ต้อง Login
router.post("/reports", reportLimiter, validateBody(createReportSchema), async (req, res) => {
  const { targetType, targetId, reason } = req.body;
  const reporterHash = hashIp(req.ip);

  const exists =
    targetType === "POST"
      ? await prisma.post.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } })
      : await prisma.comment.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true } });
  if (!exists) return res.status(404).json({ error: "ไม่พบเนื้อหาที่ต้องการรายงาน" });

  const dup = await prisma.report.findFirst({
    where: {
      reporterHash, status: "PENDING",
      ...(targetType === "POST" ? { postId: targetId } : { commentId: targetId }),
    },
    select: { id: true },
  });
  if (dup) return res.status(201).json({ ok: true }); // รายงานซ้ำ ไม่สร้างแถว/แจ้งเตือนซ้ำ

  const report = await prisma.report.create({
    data: {
      targetType,
      postId: targetType === "POST" ? targetId : null,
      commentId: targetType === "COMMENT" ? targetId : null,
      reporterHash,
      reason: sanitizeText(reason),
    },
  });

  notifyAdmins({
    type: "NEW_REPORT", title: "มีการรายงานเนื้อหาใหม่", body: report.reason.slice(0, 100),
    relatedType: "REPORT", relatedId: report.id,
  }).catch((e) => console.error("[notify]", e.message));

  res.status(201).json({ ok: true });
});

// GET /api/admin/reports?status=PENDING
router.get("/admin/reports", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const status = ["PENDING", "REVIEWED", "DISMISSED"].includes(req.query.status) ? req.query.status : "PENDING";
  const reports = await prisma.report.findMany({
    where: { status },
    include: {
      post: { select: { id: true, content: true, deletedAt: true } },
      comment: { select: { id: true, content: true, deletedAt: true, postId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ reports: reports.map(({ reporterHash, ...r }) => r) });
});

const resolveSchema = z.object({ status: z.enum(["REVIEWED", "DISMISSED"]) });

router.post("/admin/reports/:id/resolve", requireAuth, requireRole("ADMIN"), validateBody(resolveSchema), async (req, res) => {
  const report = await prisma.report.findUnique({ where: { id: req.params.id } });
  if (!report) return res.status(404).json({ error: "ไม่พบรายงานนี้" });

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: { status: req.body.status, reviewedById: req.user.id, reviewedAt: new Date() },
  });
  await logAudit({
    actorId: req.user.id, action: "REPORT_RESOLVE", targetType: "REPORT", targetId: report.id,
    metadata: { status: req.body.status, targetType: report.targetType }, ipAddress: req.ip,
  });
  res.json({ report: { id: updated.id, status: updated.status } });
});

module.exports = router;
