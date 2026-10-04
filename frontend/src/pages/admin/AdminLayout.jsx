import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Icon from "../../components/Icon";

// เมนูหลังบ้านจัดเป็นหมวดหมู่ — badge แดง = งานที่รอคุณอยู่
const GROUPS = [
  { title: null, items: [{ to: "/admin", label: "ภาพรวม", icon: "dashboard", end: true }] },
  {
    title: "เนื้อหา",
    items: [
      { to: "/admin/posts", label: "โพสต์", icon: "feed" },
      { to: "/admin/reports", label: "รายงาน", icon: "flag", badge: "pendingReports" },
      { to: "/admin/images", label: "รูปภาพ", icon: "gallery" },
      { to: "/admin/trash", label: "ถังขยะ", icon: "trash" },
    ],
  },
  { title: "ติดต่อ", items: [{ to: "/admin/support", label: "คำร้อง / ติดต่อ Admin", icon: "headset", badge: "supportUnread" }] },
  {
    title: "หน้าเว็บไซต์",
    items: [
      { to: "/admin/popups", label: "Popup", icon: "layers" },
      { to: "/admin/rules", label: "กฎการใช้งาน", icon: "book" },
      { to: "/admin/settings", label: "ตั้งค่าหน้าเว็บไซต์", icon: "settings", superOnly: true },
    ],
  },
  {
    title: "ระบบ",
    items: [
      { to: "/admin/users", label: "สมาชิก Admin", icon: "users" },
      { to: "/admin/audit-log", label: "บันทึกการทำงาน", icon: "log" },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [stats, setStats] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadStats = useCallback(() => {
    if (document.hidden) return;
    api.get("/api/admin/stats").then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    loadStats();
    const id = setInterval(loadStats, 30000);
    return () => clearInterval(id);
  }, [loadStats]);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const groups = GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly || user?.role === "SUPER_ADMIN") }))
    .filter((g) => g.items.length > 0);
  const current = groups.flatMap((g) => g.items).find((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)));

  const Nav = (
    <nav className="flex flex-col gap-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <p className="px-3 mb-1 text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">{g.title}</p>}
          <div className="flex flex-col gap-1">
            {g.items.map((t) => {
              const n = t.badge && stats ? stats[t.badge] : 0;
              return (
                <NavLink
                  key={t.to} to={t.to} end={t.end}
                  className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${isActive ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow shadow-brand-500/25" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.07]"}`}
                >
                  <Icon name={t.icon} size={18} />
                  <span className="flex-1">{t.label}</span>
                  {n > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{n}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-4 pb-16">
      {/* แถบบน */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setMenuOpen(true)} className="btn-ghost !p-2.5 lg:hidden" aria-label="เปิดเมนู"><Icon name="menu" size={20} /></button>
          <h1 className="font-bold text-xl flex items-center gap-2 truncate"><Icon name="shield" size={22} className="text-brand-500" /> หลังบ้าน</h1>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-500 dark:text-slate-300 hidden sm:block mr-1 truncate max-w-[10rem]">{user?.displayName} · {user?.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}</span>
          <Link to="/feed" className="btn-ghost !px-3 !py-2 text-xs">ดูเว็บ</Link>
          <button onClick={toggle} className="btn-ghost !p-2.5" aria-label="สลับธีม"><Icon name={dark ? "sun" : "moon"} size={17} /></button>
          <button onClick={async () => { await logout(); navigate("/", { replace: true }); }} className="btn-ghost !p-2.5" aria-label="ออกจากระบบ"><Icon name="logout" size={17} /></button>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 items-start">
        {/* เมนูข้าง (คอมพิวเตอร์) */}
        <aside className="hidden lg:block sticky top-4 card-post p-3">{Nav}</aside>

        <main className="min-w-0">
          {current && <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><Icon name={current.icon} size={19} className="text-brand-500" /> {current.label}</h2>}
          <Outlet context={{ stats, reloadStats: loadStats }} />
        </main>
      </div>

      {/* เมนู (มือถือ) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white dark:bg-[#1b2350] p-4 overflow-y-auto animate-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold flex items-center gap-2"><Icon name="shield" size={20} className="text-brand-500" /> เมนูหลังบ้าน</p>
              <button onClick={() => setMenuOpen(false)} className="btn-ghost !p-2" aria-label="ปิดเมนู"><Icon name="close" size={18} /></button>
            </div>
            {Nav}
          </div>
        </div>
      )}
    </div>
  );
}
