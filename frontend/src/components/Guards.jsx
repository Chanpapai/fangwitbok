import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-slate-400">กำลังโหลด...</div>;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <Navigate to="/staff/login" replace />;
  }
  return <Outlet />;
}
