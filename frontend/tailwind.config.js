/** @type {import('tailwindcss').Config} */
export default {
  // dark: ใช้ได้ทั่วเว็บ ยกเว้น "ภายใน" .card-post — การ์ดโพสต์เป็นพื้นขาวในโหมดมืดด้วย ลูก ๆ จึงต้องใช้สีโหมดสว่าง (อ่านง่าย คอนทราสต์ผ่าน)
  darkMode: ["variant", "&:where(.dark, .dark *):not(:where(.card-post *))"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      keyframes: { fade: { from: { opacity: 0 }, to: { opacity: 1 } } },
      animation: { fade: "fade .35s ease both" },
      // ฟอนต์สไตล์ iOS: ตัวอักษรละตินใช้ฟอนต์ระบบ (SF Pro บน iPhone/Mac, Roboto บน Android) ส่วนภาษาไทยใช้ Noto Sans Thai ที่อ่านง่ายเท่ากันทุกเครื่อง
      fontFamily: { sans: ["-apple-system", "BlinkMacSystemFont", "SF Pro Text", "Noto Sans Thai", "Sarabun", "system-ui", "sans-serif"] },
      colors: {
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])),
        ink: { 900: "#080b18", 800: "#0d1226", 700: "#141a33", 600: "#1c2444" },
      },
    },
  },
  plugins: [],
};
