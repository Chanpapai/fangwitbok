import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const ROLE_LABEL = { USER: "สมาชิก", ADMIN: "แอดมิน", SUPER_ADMIN: "ผู้ดูแลระบบสูงสุด" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");

  function load() {
    api.get("/api/admin/users").then((data) => setUsers(data.users)).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function changeRole(u, role) {
    try {
      await api.post(`/api/admin/users/${u.id}/role`, { role });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  async function toggleBan(u) {
    const reason = u.isBanned ? "" : prompt("เหตุผลที่ระงับบัญชี (ไม่บังคับ)") || "";
    try {
      await api.post(`/api/admin/users/${u.id}/ban`, { banned: !u.isBanned, reason });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {users.map((u) => (
        <div key={u.id} className="card p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {u.displayName?.[0] || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">
              {u.displayName} {u.isBanned && <span className="badge bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 ml-1">ถูกระงับ</span>}
            </p>
            <p className="text-xs text-slate-400">{u.studentCode} · {ROLE_LABEL[u.role]}</p>
          </div>
          {u.id !== me.id && (
            <div className="flex gap-1.5 shrink-0">
              {me.role === "SUPER_ADMIN" && (
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                  className="input !py-1 !px-2 !w-auto text-xs"
                >
                  <option value="USER">สมาชิก</option>
                  <option value="ADMIN">แอดมิน</option>
                  <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
                </select>
              )}
              <button onClick={() => toggleBan(u)} className="btn-ghost !py-1 !px-2 text-xs">
                {u.isBanned ? "ปลดระงับ" : "ระงับ"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
