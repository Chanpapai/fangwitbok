const { PrismaClient } = require("@prisma/client");

// ใช้ instance เดียวทั้งแอป (กัน "too many connections" ตอน hot-reload)
const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.__prisma = prisma;

module.exports = prisma;
