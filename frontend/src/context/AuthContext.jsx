import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAccessToken, bootstrapSession } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await bootstrapSession();
      if (result?.user) setUser(result.user);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (studentCode, password) => {
    const data = await api.post("/api/auth/login", { studentCode, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (studentCode, password, displayName) => {
    const data = await api.post("/api/auth/register", { studentCode, password, displayName });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* ไม่เป็นไรถึงแม้ call ไม่สำเร็จ ก็ล้างฝั่ง client ต่อ */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้ภายใน AuthProvider");
  return ctx;
}
