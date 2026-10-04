import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = { USER: "สมาชิก", ADMIN: "แอดมิน", SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด" };

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28">
      <h1 className="font-bold text-xl mb-4">👤 โปรไฟล์</h1>
      <div className="card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white text-xl font-bold">
          {user.displayName?.[0] || "?"}
        </div>
        <div>
          <p className="font-bold">{user.displayName}</p>
          <p className="text-sm text-slate-400">รหัส: {user.studentCode}</p>
          <span className="badge bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-brand-400 mt-1">
            {ROLE_LABEL[user.role]}
          </span>
        </div>
      </div>
      <button onClick={handleLogout} className="btn-danger w-full mt-4">ออกจากระบบ</button>
    </div>
  );
}
