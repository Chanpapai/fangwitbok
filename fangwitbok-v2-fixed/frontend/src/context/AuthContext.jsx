import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken, bootstrapSession } from "../lib/api";
import { getStaffFlag, setStaffFlag } from "../lib/guest";

const AuthContext = createContext(null);

// ผู้เข้าชมทั่วไปไม่มีบัญชี: กู้เซสชันก็ต่อเมื่อเครื่องนี้เคย Login เป็นทีมงานเท่านั้น
// (ไม่ยิง /auth/refresh ทุกครั้งที่เปิดเว็บ ประหยัด Request และไม่ปลุก Server โดยไม่จำเป็น)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(getStaffFlag());

  useEffect(() => {
    if (!getStaffFlag()) return;
    bootstrapSession().then((result) => {
      if (result?.user) setUser(result.user);
      else setStaffFlag(false);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (studentCode, password) => {
    const data = await api.post("/api/auth/login", { studentCode, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStaffFlag(true);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch { /* ล้างฝั่งเครื่องต่อได้ */ }
    setAccessToken(null);
    setUser(null);
    setStaffFlag(false);
  }, []);

  const isStaff = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  return <AuthContext.Provider value={{ user, isStaff, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน AuthProvider");
  return ctx;
}
