import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

// ค่าเริ่มต้น: ใช้ระหว่างรอ Backend ตื่น/ยังไม่เคยตั้งค่า — ข้อความตรงกับค่าเริ่มต้นฝั่ง Backend
export const DEFAULT_SITE = {
  homeHeadline: "ฝากบอกเรื่องราวและตามหาของหายในโรงเรียนฝางวิทยายน",
  postConfirmMessage: "โปรดคิดให้ดีก่อนทำการส่ง เพราะไม่สามารถลบได้ หากต้องการลบให้แจ้งแอดมิน",
  logoUrl: null,
  profileUrl: null,
};
const CACHE_KEY = "fwb_site";

// จำค่าล่าสุดไว้ในเครื่อง: เปิดเว็บครั้งถัดไปแสดงโลโก้/ข้อความที่ตั้งไว้ทันที ไม่กะพริบเป็นค่าเดิมระหว่างรอ Backend
function cached() {
  try { return { ...DEFAULT_SITE, ...JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") }; } catch { return DEFAULT_SITE; }
}

const SiteContext = createContext(null);

export function SiteProvider({ children }) {
  const [site, setSite] = useState(cached);

  const refresh = useCallback(async () => {
    try {
      const d = await api.get(`/api/settings?t=${Date.now()}`); // ?t= กัน cache หลัง Super Admin เพิ่งบันทึก
      const next = { ...DEFAULT_SITE, ...d };
      setSite(next);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch { /* โหมดส่วนตัว */ }
    } catch { /* ใช้ค่าที่จำไว้/ค่าเริ่มต้นต่อไป */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // รูปโปรไฟล์ (ถ้าตั้งไว้) ใช้เป็นไอคอนแท็บเบราว์เซอร์ ไม่งั้นใช้โลโก้ ไม่งั้นใช้ไอคอนเดิม
  useEffect(() => {
    const href = site.profileUrl || site.logoUrl;
    if (!href) return;
    let link = document.querySelector("link[rel='icon']");
    if (!link) { link = document.createElement("link"); link.rel = "icon"; document.head.appendChild(link); }
    link.type = "image/webp";
    link.href = href;
  }, [site.profileUrl, site.logoUrl]);

  const value = {
    site,
    refresh,
    logo: site.logoUrl || "/logo.webp", // โลโก้ใหญ่ (หน้าแรก)
    logoSm: site.logoUrl || "/logo-sm.webp", // โลโก้เล็ก (แถบบน/พื้นหลัง/หน้าล็อกอิน)
    customLogo: !!site.logoUrl,
  };
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite ต้องใช้ภายใน SiteProvider");
  return ctx;
}
