import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ตัวกั้นนี้เป็นแค่ UX — ความปลอดภัยจริงอยู่ที่ Backend (requireAuth/requireRole ทุก endpoint /api/admin/*)
export function AdminRoute() {
  const { isStaff, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-slate-600 dark:text-slate-300 text-sm">กำลังโหลด...</div>;
  if (!isStaff) return <Navigate to="/" replace />;
  return <Outlet />;
}
