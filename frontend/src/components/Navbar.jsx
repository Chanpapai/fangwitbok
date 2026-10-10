import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useSite } from "../context/SiteContext";
import { useProfile } from "../context/ProfileContext";
import Icon from "./Icon";
import Avatar from "./Avatar";
import InstallButton from "./InstallButton";

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
      {/* แถบบนสไตล์ iOS: โปร่งแสง + เบลอ เว้นช่องรอยบาก/แถบสถานะด้านบน (Safe Area) */}
      <header className={`${isHome ? "absolute" : "sticky"} top-0 inset-x-0 z-30 pt-[env(safe-area-inset-top)] ${isHome ? "" : "bg-white/75 dark:bg-ink-900/75 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-300/60 dark:border-white/[0.08]"}`}>
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14">
          {isHome ? <span /> : (
            <Link to="/" aria-label="หน้าแรก"><img src={logoSm} alt="FangwitBok V2" className="h-9 w-auto" /></Link>
          )}
          <div className="flex items-center gap-1.5">
            <InstallButton />
            {isStaff && (
              <Link to="/admin" className="btn-ghost !p-2.5" aria-label="จัดการระบบ"><Icon name="shield" size={18} /></Link>
            )}
            <button onClick={toggle} className="btn-ghost !p-2.5" aria-label={dark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}>
              <Icon name={dark ? "sun" : "moon"} size={18} />
            </button>
            {/* รูปโปรไฟล์มุมบนขวา → หน้าตั้งค่า (โปรไฟล์ + สีธีม) */}
            <Link to="/settings" aria-label="ตั้งค่าและโปรไฟล์" className={`rounded-full p-0.5 ring-2 transition active:scale-90 ${pathname === "/settings" ? "ring-brand-500" : "ring-white/80 dark:ring-white/25"}`}>
              <Avatar src={profile.avatarUrl} name={profile.name} size={34} />
            </Link>
          </div>
        </div>
      </header>

      {!isHome && (
        <nav aria-label="เมนูหลัก" className="fixed bottom-0 inset-x-0 z-30 bg-white/80 dark:bg-ink-900/80 backdrop-blur-xl backdrop-saturate-150 border-t border-slate-300/60 dark:border-white/[0.08] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          <div className="max-w-xl mx-auto grid grid-cols-4">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to} to={item.to} aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold ${active ? "text-brand-700 dark:text-brand-300" : "text-slate-600 dark:text-slate-300"}`}
                >
                  {item.primary ? (
                    <span className="w-10 h-7 -mt-0.5 rounded-full bg-brand-600 text-white flex items-center justify-center shadow shadow-brand-600/30">
                      <Icon name={item.icon} size={18} strokeWidth={2.4} />
                    </span>
                  ) : <Icon name={item.icon} size={24} strokeWidth={active ? 2.3 : 1.9} />}
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
