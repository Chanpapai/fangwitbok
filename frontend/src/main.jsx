import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { SiteProvider } from "./context/SiteContext";
import { DialogProvider } from "./components/Dialogs";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DialogProvider>
          <SiteProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </SiteProvider>
        </DialogProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// PWA: ลงทะเบียน Service Worker เฉพาะ production (ตอน dev ปิดไว้ กัน cache รบกวนการแก้โค้ด)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
