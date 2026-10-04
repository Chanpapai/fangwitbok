import { createContext, useContext, useEffect, useState } from "react";
import { setTheme as persist } from "../lib/guest";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#080b18" : "#f8fafc");
    persist(dark ? "dark" : "light");
  }, [dark]);

  return <ThemeContext.Provider value={{ dark, toggle: () => setDark((v) => !v) }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
