const prisma = require("../config/db");

/** แจ้งเตือน Admin/Super Admin ทุกคน (recipientId = null หมายถึงกว้างถึงทุกแอดมิน) */
async function notifyAdmins({ type, title, body, relatedType, relatedId }) {
  await prisma.notification.create({
    data: { recipientId: null, type, title, body, relatedType, relatedId },
  });
}

/** แจ้งเตือนผู้ใช้คนใดคนหนึ่งโดยเฉพาะ */
async function notifyUser({ recipientId, type, title, body, relatedType, relatedId }) {
  await prisma.notification.create({
    data: { recipientId, type, title, body, relatedType, relatedId },
  });
}

module.exports = { notifyAdmins, notifyUser };
