/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Prompt", "Noto Sans Thai", "system-ui", "sans-serif"] },
      colors: {
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700].map((n) => [n, `rgb(var(--brand-${n}) / <alpha-value>)`])), // สีธีมเปลี่ยนได้ในหน้าตั้งค่า (ตัวแปรอยู่ใน index.css)
        ink: { 900: "#080b18", 800: "#0d1226", 700: "#141a33", 600: "#1c2444" },
      },
    },
  },
  plugins: [],
};
