/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5ff",
          100: "#e0ebff",
          400: "#60a5fa", // ฟ้า
          500: "#6d5df6", // ม่วง-น้ำเงิน (สีหลัก)
          600: "#5847e0",
          700: "#4638b8",
        },
      },
    },
  },
  plugins: [],
};
