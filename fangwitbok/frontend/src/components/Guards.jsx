import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-6 text-center text-slate-400">กำลังโหลด...</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-center text-slate-400">กำลังโหลด...</div>;
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function SuperAdminOnly({ children }) {
  const { user } = useAuth();
  if (user?.role !== "SUPER_ADMIN") return null;
  return children;
}
