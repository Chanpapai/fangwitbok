/** @type {import('tailwindcss').Config} */
export default {
  // dark: ใช้ได้ทั่วเว็บ ยกเว้น "ภายใน" .card-post — การ์ดโพสต์เป็นพื้นขาวในโหมดมืดด้วย ลูก ๆ จึงต้องใช้สีโหมดสว่าง (อ่านง่าย คอนทราสต์ผ่าน)
  darkMode: ["variant", "&:where(.dark, .dark *):not(:where(.card-post *))"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      keyframes: { fade: { from: { opacity: 0 }, to: { opacity: 1 } } },
      animation: { fade: "fade .35s ease both" },
      fontFamily: { sans: ["Prompt", "Noto Sans Thai", "system-ui", "sans-serif"] },
      colors: {
        brand: {
          50: "#f0f5ff", 100: "#e0ebff", 200: "#c7d6fe", 300: "#a5b8fc",
          400: "#60a5fa", 500: "#6d5df6", 600: "#5847e0", 700: "#4638b8",
        },
        ink: { 900: "#080b18", 800: "#0d1226", 700: "#141a33", 600: "#1c2444" },
      },
    },
  },
  plugins: [],
};
