import { createContext, useContext, useEffect, useState } from "react";
import { setTheme as persist, getAccent, setAccent as persistAccent } from "../lib/guest";

const ThemeContext = createContext(null);

// สีธีมที่เลือกได้ (ค่าสีจริงอยู่ใน index.css ที่ [data-accent="..."]) — ทุกสีผ่านการตรวจคอนทราสต์ปุ่มตัวอักษรขาว ≥ 4.5:1
export const ACCENTS = [
  { id: "default", label: "ฟ้า-ม่วง" },
  { id: "blue", label: "ฟ้า" },
  { id: "purple", label: "ม่วง" },
  { id: "pink", label: "ชมพู" },
  { id: "green", label: "เขียว" },
  { id: "orange", label: "ส้ม" },
];
const ACCENT_IDS = ACCENTS.map((a) => a.id);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [accent, setAccentState] = useState(() => (ACCENT_IDS.includes(getAccent()) ? getAccent() : "default"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#080b18" : "#f8fafc");
    persist(dark ? "dark" : "light");
  }, [dark]);

  // เปลี่ยนสีแล้ว UI อัปเดตทันที และจำไว้ในเครื่อง (คงอยู่หลังรีเฟรช)
  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
    persistAccent(accent);
  }, [accent]);

  const setAccent = (id) => ACCENT_IDS.includes(id) && setAccentState(id);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark((v) => !v), accent, setAccent }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
