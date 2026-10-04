import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { MegaphoneIcon, SearchIcon, SunIcon, MoonIcon, RuleIcon } from "./Icons";

const NAV = [
  { to: "/feed", Icon: SearchIcon, label: "โพสต์" },
  { to: "/create", Icon: MegaphoneIcon, label: "ฝากบอก" },
  { to: "/rules", Icon: RuleIcon, label: "กฎ" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { dark, toggle } = useTheme();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-small.webp" alt="FangwitBok" className="h-7 w-auto" />
          </Link>
          <button onClick={toggle} className="btn-ghost !px-2.5" aria-label="สลับธีม">
            {dark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto grid grid-cols-3">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active ? "text-brand-500" : "text-slate-400"}`}>
                <item.Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
