const cron = require("node-cron");
const prisma = require("../config/db");
const { deleteImageFile } = require("../utils/image");
const { logAudit } = require("../utils/audit");

const RETENTION_DAYS = 15;

async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);

  const expiredPosts = await prisma.post.findMany({
    where: { deletedAt: { lt: cutoff } },
    include: { images: true },
  });

  for (const post of expiredPosts) {
    await Promise.all(post.images.map((img) => deleteImageFile(img.path)));
    await prisma.post.delete({ where: { id: post.id } });
    // ระบบเป็นผู้ลบเอง (ไม่ใช่ Admin คนใดคนหนึ่ง) บันทึกไว้ด้วย actorId ของผู้ที่สั่งลบครั้งแรก ถ้ามี
    await logAudit({
      actorId: post.deletedById || post.authorId,
      action: "POST_AUTO_PURGE",
      targetType: "POST",
      targetId: post.id,
      metadata: { reason: `เกิน ${RETENTION_DAYS} วันใน Trash` },
    }).catch(() => {});
  }

  const expiredComments = await prisma.comment.findMany({ where: { deletedAt: { lt: cutoff } } });
  for (const comment of expiredComments) {
    await prisma.comment.delete({ where: { id: comment.id } });
    await logAudit({
      actorId: comment.deletedById || comment.authorId,
      action: "COMMENT_AUTO_PURGE",
      targetType: "COMMENT",
      targetId: comment.id,
      metadata: { reason: `เกิน ${RETENTION_DAYS} วันใน Trash` },
    }).catch(() => {});
  }

  if (expiredPosts.length || expiredComments.length) {
    console.log(
      `[purgeTrash] ลบถาวรอัตโนมัติ: โพสต์ ${expiredPosts.length} รายการ, คอมเมนต์ ${expiredComments.length} รายการ`
    );
  }
}

/** รันทุกวันเวลา 03:00 (เวลาของเซิร์ฟเวอร์) */
function scheduleTrashPurge() {
  cron.schedule("0 3 * * *", () => {
    purgeExpiredTrash().catch((err) => console.error("[purgeTrash] ล้มเหลว:", err));
  });
  console.log("[purgeTrash] ตั้งเวลาลบถาวรอัตโนมัติทุกวัน 03:00 น. (เกิน 15 วันใน Trash)");
}

module.exports = { scheduleTrashPurge, purgeExpiredTrash };
