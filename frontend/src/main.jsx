import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SiteProvider } from "./context/SiteContext";
import { DialogProvider } from "./components/DialogProvider";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <SiteProvider>
          <AuthProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </AuthProvider>
        </SiteProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// PWA: ลงทะเบียน Service Worker (เฉพาะ production) เพื่อให้ติดตั้งเว็บเป็นแอปบนหน้าจอหลักได้
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
