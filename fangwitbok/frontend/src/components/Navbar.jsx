import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV = [
  { to: "/", icon: "🏠", label: "ฟีด" },
  { to: "/create", icon: "✏️", label: "โพสต์" },
  { to: "/rules", icon: "📋", label: "กฎ" },
  { to: "/profile", icon: "👤", label: "โปรไฟล์" },
];

export default function Navbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 py-3">
          <Link to="/" className="font-extrabold text-lg bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent">
            🗣️ FangwitBok
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={toggle} className="btn-ghost !px-2.5" aria-label="สลับธีม">
              {dark ? "☀️" : "🌙"}
            </button>
            {user?.role !== "USER" && (
              <button onClick={() => navigate("/admin")} className="btn-ghost !px-3 text-xs">
                🛠️ Admin
              </button>
            )}
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-xl mx-auto grid grid-cols-4">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-brand-500" : "text-slate-400"
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
