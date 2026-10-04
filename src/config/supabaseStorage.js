const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "ต้องตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ใน .env ก่อนรันเซิร์ฟเวอร์ " +
      "(ใช้สำหรับเก็บรูปแบบถาวร ไม่หายเมื่อ deploy ใหม่ — ดูวิธีสร้างใน INSTALL.md)"
  );
}

// service_role key ใช้เฉพาะฝั่งเซิร์ฟเวอร์นี้เท่านั้น ห้ามส่งให้ frontend เด็ดขาด
// (มีสิทธิ์เต็มข้ามผ่าน RLS ได้ — เหมาะกับงานฝั่ง backend ที่เชื่อถือได้เท่านั้น)
const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

module.exports = { supabaseAdmin };
