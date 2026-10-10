import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSite } from "../context/SiteContext";
import { useProfile } from "../context/ProfileContext";
import Icon from "./Icon";
import Avatar from "./Avatar";

const NAV = [
  { to: "/", icon: "home", label: "หน้าแรก" },
  { to: "/feed", icon: "feed", label: "โพสต์" },
  { to: "/new", icon: "plus", label: "ฝากบอก", primary: true },
  { to: "/rules", icon: "book", label: "กฎ" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { isStaff } = useAuth();
  const { dark, toggle } = useTheme();
  const { logoSm } = useSite();
  const { profile } = useProfile();
  const isHome = pathname === "/";

  return (
    <>
      <header className={`${isHome ? "absolute" : "sticky"} top-0 inset-x-0 z-30 ${isHome ? "" : "bg-white/80 dark:bg-ink-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-white/[0.06]"}`}>
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14">
          {isHome ? <span /> : (
            <Link to="/" aria-label="หน้าแรก"><img src={logoSm} alt="FangwitBok V2" className="h-9 w-auto" /></Link>
          )}
          <div className="flex items-center gap-1.5">
            {isStaff && (
              <Link to="/admin" className="btn-ghost !p-2.5" aria-label="จัดการระบบ"><Icon name="shield" size={18} /></Link>
            )}
            <button onClick={toggle} className="btn-ghost !p-2.5" aria-label="สลับธีม">
              <Icon name={dark ? "sun" : "moon"} size={18} />
            </button>
            {/* รูปโปรไฟล์ → หน้าตั้งค่า (โปรไฟล์ + สีธีม) */}
            <Link to="/settings" aria-label="ตั้งค่าและโปรไฟล์" className={`rounded-full p-0.5 ring-2 transition active:scale-90 ${pathname === "/settings" ? "ring-brand-500" : "ring-white/80 dark:ring-white/25"}`}>
              <Avatar src={profile.avatarUrl} name={profile.name} size={34} />
            </Link>
          </div>
        </div>
      </header>

      {!isHome && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-ink-900/90 backdrop-blur-md border-t border-slate-200/70 dark:border-white/[0.06] pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-xl mx-auto grid grid-cols-4">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to} to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-700 dark:text-brand-300" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {item.primary ? (
                    <span className="w-9 h-7 -mt-0.5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow shadow-brand-600/30">
                      <Icon name={item.icon} size={18} strokeWidth={2.4} />
                    </span>
                  ) : <Icon name={item.icon} size={22} />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
