require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { generalLimiter } = require("./middleware/rateLimit");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comments");
const likeRoutes = require("./routes/likes");
const reportRoutes = require("./routes/reports");
const trashRoutes = require("./routes/trash");
const popupRoutes = require("./routes/popups");
const notificationRoutes = require("./routes/notifications");
const setupRoutes = require("./routes/setup");
const ruleRoutes = require("./routes/rules");
const supportRoutes = require("./routes/support");

const app = express();

// เชื่อถือ proxy ชั้นเดียว (Nginx/Vercel/Render ด้านหน้า) เพื่อให้ req.ip ถูกต้อง
app.set("trust proxy", 1);

app.use(helmet());

// CORS: อนุญาตเฉพาะโดเมนหน้าเว็บที่ตั้งค่าไว้เท่านั้น ไม่ใช้ "*" เพราะต้องส่ง cookie ข้ามมาด้วย
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Origin นี้ไม่ได้รับอนุญาต (CORS)"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" })); // จำกัดขนาด body กัน payload ขนาดใหญ่ผิดปกติ (ไม่รวมไฟล์รูป ซึ่งผ่าน multer แยก)
app.use(cookieParser());
app.use(generalLimiter);

// หมายเหตุ: รูปภาพทั้งหมดเก็บที่ Supabase Storage แล้ว (persistent ไม่หายตอน deploy ใหม่)
// จึงไม่ต้อง serve ไฟล์ static จากดิสก์เซิร์ฟเวอร์อีกต่อไป (ดู src/utils/image.js)

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/setup", setupRoutes); // หน้าเว็บสร้าง Super Admin คนแรก (ใช้เบราว์เซอร์ล้วน ๆ ไม่ต้องใช้ terminal)

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes); // /api/admin/users, /api/admin/audit-logs
app.use("/api/posts", postRoutes);
app.use("/api/posts", likeRoutes); // /api/posts/:postId/like
app.use("/api", commentRoutes); // /api/posts/:postId/comments , /api/comments/:id
app.use("/api", reportRoutes); // /api/reports , /api/admin/reports*
app.use("/api/admin/trash", trashRoutes);
app.use("/api", popupRoutes); // /api/popups , /api/admin/popups*
app.use("/api", notificationRoutes); // /api/notifications , /api/admin/notifications*
app.use("/api", ruleRoutes); // /api/rules , /api/admin/rules*
app.use("/api", supportRoutes); // /api/support/* (แจ้งปัญหา), /api/admin/support/*

// 404
app.use((req, res) => res.status(404).json({ error: "ไม่พบเส้นทางนี้" }));

// Error handler กลาง — ไม่ส่ง stack trace หรือรายละเอียดภายในกลับไปหา client
app.use((err, req, res, _next) => {
  console.error("[error]", err.message);
  if (err.message?.includes("CORS")) return res.status(403).json({ error: err.message });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 5MB ต่อไฟล์)" });
  if (err.message?.includes("รองรับเฉพาะไฟล์")) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
});

module.exports = app;
