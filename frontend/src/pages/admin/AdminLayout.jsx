import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Icon from "../../components/Icon";

const TABS = [
  { to: "/admin", label: "ภาพรวม", icon: "dashboard", end: true },
  { to: "/admin/support", label: "แชท", icon: "lifebuoy", badge: true },
  { to: "/admin/reports", label: "รายงาน", icon: "flag" },
  { to: "/admin/trash", label: "Trash", icon: "trash" },
  { to: "/admin/popups", label: "Popup", icon: "layers" },
  { to: "/admin/rules", label: "กฎ", icon: "book" },
  { to: "/admin/users", label: "ทีมงาน", icon: "users" },
  { to: "/admin/audit-log", label: "บันทึก", icon: "log" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const check = () => !document.hidden && api.get("/api/admin/support/unread-count").then((d) => setUnread(d.count)).catch(() => {});
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 py-4 pb-16">
      <div className="flex items-center justify-between mb-3">
        <h1 className="font-bold text-xl flex items-center gap-2"><Icon name="shield" size={22} className="text-brand-500" /> หลังบ้าน</h1>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 hidden sm:block mr-1">{user?.displayName}</span>
          <Link to="/feed" className="btn-ghost !px-3 !py-2 text-xs">ดูเว็บ</Link>
          <button onClick={toggle} className="btn-ghost !p-2.5" aria-label="สลับธีม"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
          <button onClick={async () => { await logout(); navigate("/", { replace: true }); }} className="btn-ghost !p-2.5" aria-label="ออกจากระบบ"><Icon name="logout" size={17} /></button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `chip flex items-center gap-1.5 ${isActive ? "chip-on" : "chip-off"}`}>
            <Icon name={t.icon} size={15} /> {t.label}
            {t.badge && unread > 0 && <span className="ml-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
