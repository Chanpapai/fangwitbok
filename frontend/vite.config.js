import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:4000" } }, // dev: เรียก /api แล้วส่งต่อไป Backend ในเครื่อง
});
