const sanitizeHtml = require("sanitize-html");

// เนื้อหาโพสต์/คอมเมนต์เป็นข้อความล้วน ไม่รองรับ HTML/Markdown ใด ๆ
// ตัดแท็กทั้งหมดทิ้ง (รวม <script>, <img onerror>, ฯลฯ) เหลือแต่ข้อความ กัน Stored XSS เด็ดขาด
function sanitizeText(input) {
  const stripped = sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} });
  return stripped.trim();
}

module.exports = { sanitizeText };
