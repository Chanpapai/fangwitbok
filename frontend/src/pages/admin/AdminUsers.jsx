import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useDialog } from "../../components/DialogProvider";
import Icon from "../../components/Icon";

const ROLE_LABEL = { ADMIN: "แอดมิน", SUPER_ADMIN: "ผู้ดูแลสูงสุด" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { confirm, notify } = useDialog();
  const isSuper = me.role === "SUPER_ADMIN";
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ displayName: "", password: "", role: "ADMIN" });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() { api.get("/api/admin/users").then((d) => setUsers(d.users)).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function changeRole(u, role) {
    if (role === u.role) return;
    const ok = await confirm({
      title: "เปลี่ยนระดับสิทธิ์?",
      message: `เปลี่ยน “${u.displayName}” เป็น${ROLE_LABEL[role]}`,
      confirmText: "เปลี่ยนสิทธิ์",
    });
    if (!ok) return;
    try { await api.post(`/api/admin/users/${u.id}/role`, { role }); load(); } catch (err) { notify(err.message); }
  }

  // ถอดออกจาก Admin: ตรวจสิทธิ์ Super Admin ที่ Backend ทุกครั้ง (ปุ่มนี้แค่ซ่อนจากคนที่ไม่มีสิทธิ์)
  async function demote(u) {
    const ok = await confirm({
      title: "ถอดออกจาก Admin?",
      message: `“${u.displayName}” จะไม่สามารถเข้าหลังบ้านได้อีก และถูกออกจากระบบทุกเครื่องทันที`,
      confirmText: "ถอดออกจาก Admin", tone: "danger",
    });
    if (!ok) return;
    try { await api.post(`/api/admin/users/${u.id}/role`, { role: "USER" }); notify(`ถอด ${u.displayName} ออกจาก Admin แล้ว`, "success"); load(); }
    catch (err) { notify(err.message); }
  }

  async function toggleBan(u) {
    const reason = await confirm(
      u.isBanned
        ? { title: "ปลดระงับบัญชีนี้?", message: `“${u.displayName}” จะกลับมาเข้าสู่ระบบได้`, confirmText: "ปลดระงับ" }
        : { title: "ระงับบัญชีนี้?", message: `“${u.displayName}” จะเข้าสู่ระบบไม่ได้จนกว่าจะปลดระงับ`, confirmText: "ระงับบัญชี", tone: "danger", input: { label: "เหตุผล (ไม่บังคับ)", placeholder: "เช่น ละเมิดกฎการใช้งาน" } }
    );
    if (reason === false) return;
    try { await api.post(`/api/admin/users/${u.id}/ban`, { banned: !u.isBanned, reason: typeof reason === "string" ? reason : "" }); load(); } catch (err) { notify(err.message); }
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api.post("/api/admin/users", form);
      setForm({ displayName: "", password: "", role: "ADMIN" });
      notify("เพิ่มบัญชีทีมงานแล้ว", "success");
      load();
    } catch (err) {
      setError(err.details ? Object.values(err.details).flat().join(", ") : err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex flex-col gap-4">
      {isSuper && (
        <form onSubmit={create} className="card p-4 flex flex-col gap-2.5">
          <p className="font-bold flex items-center gap-2"><Icon name="plus" size={17} /> เพิ่มบัญชีทีมงาน</p>
          <p className="text-xs text-slate-500 dark:text-slate-300">ทีมงานเข้าสู่ระบบด้วย “ชื่อจริง” และรหัสผ่านนี้</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="ชื่อจริง" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required maxLength={50} autoComplete="off" />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="ADMIN">แอดมิน</option>
              <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
            </select>
            <div className="relative col-span-2">
              <input className="input pr-11" type={showPw ? "text" : "password"} placeholder="รหัสผ่าน (8+ ตัว มีตัวเลข)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={showPw}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10">
                <Icon name={showPw ? "eyeoff" : "eye"} size={18} />
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={busy} className="btn-primary">เพิ่มบัญชี</button>
        </form>
      )}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="card p-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {u.displayName} {u.id === me.id && <span className="text-xs font-normal text-slate-500 dark:text-slate-300">(คุณ)</span>}
                {u.isBanned && <span className="badge bg-red-500/15 text-red-600 dark:text-red-300 ml-1">ถูกระงับ</span>}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{ROLE_LABEL[u.role]}</p>
            </div>
            {isSuper && u.id !== me.id && (
              <div className="flex gap-1.5 shrink-0 flex-wrap">
                <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="input !py-1 !px-2 !w-auto text-xs" aria-label="ระดับสิทธิ์">
                  <option value="ADMIN">แอดมิน</option>
                  <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
                </select>
                <button onClick={() => toggleBan(u)} className="btn-ghost !py-1 !px-2.5 text-xs">{u.isBanned ? "ปลดระงับ" : "ระงับ"}</button>
                <button onClick={() => demote(u)} className="btn-danger !py-1 !px-2.5 text-xs">ถอดออกจาก Admin</button>
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && !error && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีทีมงาน</p>}
      </div>
    </div>
  );
}
