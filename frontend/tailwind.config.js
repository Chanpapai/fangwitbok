/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
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
