const express = require("express");
const { z } = require("zod");
const prisma = require("../config/db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { processAndSaveImages, deleteImageFile } = require("../utils/image");
const { sanitizeText } = require("../utils/sanitize");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// GET /api/rules — สาธารณะ
router.get("/rules", async (_req, res) => {
  const blocks = await prisma.ruleBlock.findMany({ orderBy: { order: "asc" } });
  res.json({ blocks });
});

// POST /api/admin/rules — เพิ่มบล็อกใหม่ (แนบรูปได้ไม่บังคับ)
router.post("/admin/rules", requireAuth, requireRole("ADMIN"), upload.single("image"), async (req, res) => {
  const { heading, body } = req.body;
  let img = null;
  if (req.file) {
    try {
      [img] = await processAndSaveImages([req.file], "rules");
    } catch (e) {
      return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้อง" });
    }
  }
  const count = await prisma.ruleBlock.count();
  const block = await prisma.ruleBlock.create({
    data: {
      order: count,
      heading: sanitizeText(heading || "") || null,
      body: sanitizeText(body || "") || null,
      imageUrl: img?.url || null,
      imagePath: img?.path || null,
      createdById: req.user.id,
    },
  });
  await logAudit({ actorId: req.user.id, action: "RULE_CREATE", targetType: "RULE", targetId: block.id, ipAddress: req.ip });
  res.status(201).json({ block });
});

// PATCH /api/admin/rules/:id — แก้ข้อความ/ลำดับ/รูป
router.patch("/admin/rules/:id", requireAuth, requireRole("ADMIN"), upload.single("image"), async (req, res) => {
  const existing = await prisma.ruleBlock.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบรายการนี้" });

  let img = null;
  if (req.file) {
    try {
      [img] = await processAndSaveImages([req.file], "rules");
      if (existing.imagePath) await deleteImageFile(existing.imagePath);
    } catch (e) {
      return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้อง" });
    }
  }
  const { heading, body, order } = req.body;
  const block = await prisma.ruleBlock.update({
    where: { id: req.params.id },
    data: {
      ...(heading !== undefined && { heading: sanitizeText(heading) || null }),
      ...(body !== undefined && { body: sanitizeText(body) || null }),
      ...(order !== undefined && { order: parseInt(order) || 0 }),
      ...(img && { imageUrl: img.url, imagePath: img.path }),
    },
  });
  await logAudit({ actorId: req.user.id, action: "RULE_UPDATE", targetType: "RULE", targetId: block.id, ipAddress: req.ip });
  res.json({ block });
});

// DELETE /api/admin/rules/:id
router.delete("/admin/rules/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.ruleBlock.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "ไม่พบรายการนี้" });
  if (existing.imagePath) await deleteImageFile(existing.imagePath);
  await prisma.ruleBlock.delete({ where: { id: req.params.id } });
  await logAudit({ actorId: req.user.id, action: "RULE_DELETE", targetType: "RULE", targetId: req.params.id, ipAddress: req.ip });
  res.json({ ok: true });
});

module.exports = router;
