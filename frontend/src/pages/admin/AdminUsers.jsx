import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";

const ROLE_LABEL = { USER: "สมาชิกเดิม", ADMIN: "แอดมิน", SUPER_ADMIN: "ผู้ดูแลสูงสุด" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ studentCode: "", displayName: "", password: "", role: "ADMIN" });
  const [busy, setBusy] = useState(false);

  function load() { api.get("/api/admin/users").then((d) => setUsers(d.users)).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function changeRole(u, role) {
    try { await api.post(`/api/admin/users/${u.id}/role`, { role }); load(); } catch (err) { alert(err.message); }
  }
  async function toggleBan(u) {
    const reason = u.isBanned ? "" : prompt("เหตุผลที่ระงับบัญชี (ไม่บังคับ)") || "";
    try { await api.post(`/api/admin/users/${u.id}/ban`, { banned: !u.isBanned, reason }); load(); } catch (err) { alert(err.message); }
  }
  async function create(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api.post("/api/admin/users", form);
      setForm({ studentCode: "", displayName: "", password: "", role: "ADMIN" });
      load();
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join(", ") : err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {me.role === "SUPER_ADMIN" && (
        <form onSubmit={create} className="card p-4 flex flex-col gap-2.5">
          <p className="font-bold flex items-center gap-2"><Icon name="plus" size={17} /> เพิ่มบัญชีทีมงาน</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="รหัสผู้ดูแล (4-20 ตัว)" value={form.studentCode} onChange={(e) => setForm({ ...form, studentCode: e.target.value })} required minLength={4} maxLength={20} />
            <input className="input" placeholder="ชื่อที่แสดง" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={50} />
            <input className="input" type="password" placeholder="รหัสผ่าน (8+ ตัว มีตัวเลข)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">แอดมิน</option>
              <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="btn-primary">เพิ่มบัญชี</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="card p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {u.displayName} {u.isBanned && <span className="badge bg-red-500/15 text-red-500 ml-1">ถูกระงับ</span>}
              </p>
              <p className="text-xs text-slate-400">{u.studentCode} · {ROLE_LABEL[u.role]}</p>
            </div>
            {u.id !== me.id && (
              <div className="flex gap-1.5 shrink-0">
                {me.role === "SUPER_ADMIN" && (
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="input !py-1 !px-2 !w-auto text-xs">
                    <option value="USER">สมาชิกเดิม</option>
                    <option value="ADMIN">แอดมิน</option>
                    <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
                  </select>
                )}
                <button onClick={() => toggleBan(u)} className="btn-ghost !py-1 !px-2.5 text-xs">{u.isBanned ? "ปลดระงับ" : "ระงับ"}</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
