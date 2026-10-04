import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const TABS = [
  { to: "/staff", label: "ภาพรวม", end: true },
  { to: "/staff/reports", label: "รายงาน" },
  { to: "/staff/trash", label: "Trash" },
  { to: "/staff/popups", label: "Popup" },
  { to: "/staff/rules", label: "กฎ" },
  { to: "/staff/support", label: "แจ้งปัญหา" },
  { to: "/staff/users", label: "ผู้ใช้" },
  { to: "/staff/audit-log", label: "Audit Log" },
];

export default function AdminLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-xl">Admin Dashboard</h1>
        <button onClick={async () => { await logout(); navigate("/"); }} className="text-sm text-red-500 font-semibold">ออกจากระบบ</button>
      </div>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end}
            className={({ isActive }) => `px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${isActive ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
