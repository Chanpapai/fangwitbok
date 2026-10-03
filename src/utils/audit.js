const prisma = require("../config/db");

/**
 * บันทึก Audit Log แบบ append-only
 * เรียกใช้ทุกครั้งที่ Admin/Super Admin ทำการกระทำสำคัญ (ลบ/กู้คืนโพสต์, จัดการรายงาน,
 * เปลี่ยนสิทธิ์ผู้ใช้, สร้าง/แก้ Popup ฯลฯ)
 */
async function logAudit({ actorId, action, targetType, targetId, metadata, ipAddress }) {
  await prisma.auditLog.create({
    data: { actorId, action, targetType, targetId, metadata: metadata ?? undefined, ipAddress },
  });
}

module.exports = { logAudit };
