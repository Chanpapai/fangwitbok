import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/admin", label: "📊 ภาพรวม", end: true },
  { to: "/admin/reports", label: "🚩 รายงาน" },
  { to: "/admin/trash", label: "🗑️ Trash" },
  { to: "/admin/popups", label: "📢 Popup" },
  { to: "/admin/users", label: "👥 ผู้ใช้" },
  { to: "/admin/audit-log", label: "📜 Audit Log" },
];

export default function AdminLayout() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 pb-28">
      <h1 className="font-bold text-xl mb-3">🛠️ Admin Dashboard</h1>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${
                isActive ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
