require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { generalLimiter } = require("./middleware/rateLimit");

const app = express();
app.set("trust proxy", 1); // อยู่หลัง proxy ของ Render/Vercel เพื่อให้ req.ip ถูกต้อง (ใช้ทำ rate limit)

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// หน้าตั้งค่า Super Admin คนแรก: อยู่ก่อน CORS เพราะเปิดตรงจากโดเมน API เอง (ไม่ใช่จากหน้าเว็บ)
// ยังปลอดภัย เพราะต้องมี SETUP_SECRET และใช้ได้ครั้งเดียวเมื่อยังไม่มี Super Admin
app.use("/api/setup", generalLimiter, require("./routes/setup"));

// CORS: อนุญาตเฉพาะโดเมนหน้าเว็บที่ตั้งค่าไว้ (ไม่ใช้ "*" เพราะต้องส่ง cookie ของ Admin ข้ามมาด้วย)
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

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(generalLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/admin", require("./routes/admin")); // users, audit-logs
app.use("/api/posts", require("./routes/posts"));
app.use("/api/posts", require("./routes/likes")); // /api/posts/:postId/like
app.use("/api", require("./routes/comments")); // /api/posts/:postId/comments , /api/comments/:id
app.use("/api", require("./routes/reports")); // /api/reports , /api/admin/reports*
app.use("/api/admin/trash", require("./routes/trash"));
app.use("/api", require("./routes/popups")); // /api/popups , /api/admin/popups*
app.use("/api", require("./routes/rules")); // /api/rules , /api/admin/rules* , /api/admin/upload/:folder
app.use("/api", require("./routes/support")); // /api/support/* , /api/admin/support*
app.use("/api", require("./routes/notifications"));
app.use("/api", require("./routes/profile")); // /api/profile (ของตัวเองเท่านั้น)
app.use("/api", require("./routes/settings")); // /api/settings , /api/admin/settings|stats|posts|images

app.use((req, res) => res.status(404).json({ error: "ไม่พบเส้นทางนี้" }));

app.use((err, req, res, _next) => {
  console.error("[error]", err.message);
  if (err.message?.includes("CORS")) return res.status(403).json({ error: err.message });
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 5MB ต่อไฟล์)" });
  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") return res.status(400).json({ error: "แนบรูปได้สูงสุด 5 รูป" });
  if (err.message?.includes("รองรับเฉพาะไฟล์")) return res.status(400).json({ error: err.message });
  if (err.type === "entity.parse.failed") return res.status(400).json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" });
  res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง" });
});

module.exports = app;
