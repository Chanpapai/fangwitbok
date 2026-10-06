import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import { useDialogs } from "../../components/Dialogs";

const ROLE_LABEL = { USER: "สมาชิกเดิม", ADMIN: "แอดมิน", SUPER_ADMIN: "ผู้ดูแลสูงสุด" };
const NEW = { displayName: "", password: "", role: "ADMIN" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const { confirm, toast } = useDialogs();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState(NEW);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const isSuper = me.role === "SUPER_ADMIN";

  function load() { api.get("/api/admin/users").then((d) => setUsers(d.users)).catch((e) => setError(e.message)); }
  useEffect(load, []);

  async function changeRole(u, role) {
    const ok = await confirm({
      title: "เปลี่ยนสิทธิ์?", message: `เปลี่ยนสิทธิ์ของ "${u.displayName}"\nจาก ${ROLE_LABEL[u.role]} เป็น ${ROLE_LABEL[role]}`,
      confirmText: "เปลี่ยนสิทธิ์", icon: "shield",
    });
    if (!ok) return;
    try { await api.post(`/api/admin/users/${u.id}/role`, { role }); toast("เปลี่ยนสิทธิ์แล้ว", "success"); load(); } catch (err) { toast(err.message, "error"); }
  }

  // ถอดออกจาก Admin: เฉพาะ Super Admin (Backend ตรวจสิทธิ์ซ้ำ) + ต้องยืนยันก่อนเสมอ
  async function removeAdmin(u) {
    const ok = await confirm({
      title: "ถอดออกจาก Admin?",
      message: `"${u.displayName}" จะไม่มีสิทธิ์เข้าหลังบ้านอีกต่อไป และถูกออกจากระบบทุกอุปกรณ์ทันที`,
      confirmText: "ถอดออกจาก Admin", tone: "danger", icon: "shield",
    });
    if (!ok) return;
    try { await api.post(`/api/admin/users/${u.id}/remove-admin`); toast(`ถอด "${u.displayName}" ออกจาก Admin แล้ว`, "success"); load(); } catch (err) { toast(err.message, "error"); }
  }

  async function toggleBan(u) {
    let reason = "";
    if (!u.isBanned) {
      const r = await confirm({
        title: "ระงับบัญชีนี้?", message: `"${u.displayName}" จะเข้าใช้งานไม่ได้จนกว่าจะปลดระงับ`,
        confirmText: "ระงับบัญชี", tone: "danger", icon: "lock", input: { label: "เหตุผล (ไม่บังคับ)", maxLength: 300 },
      });
      if (r === null) return;
      reason = r;
    }
    try { await api.post(`/api/admin/users/${u.id}/ban`, { banned: !u.isBanned, reason }); load(); } catch (err) { toast(err.message, "error"); }
  }

  async function create(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      await api.post("/api/admin/users", form);
      toast(`เพิ่ม "${form.displayName}" แล้ว`, "success");
      setForm(NEW);
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
          <p className="text-xs text-slate-600 dark:text-slate-300">ทีมงานเข้าสู่ระบบด้วย “ชื่อจริง” + “รหัสผ่าน” (ชื่อซ้ำกันไม่ได้)</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="ชื่อจริง" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required minLength={2} maxLength={50} autoComplete="off" />
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} aria-label="สิทธิ์">
              <option value="ADMIN">แอดมิน</option>
              <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
            </select>
            <div className="relative col-span-2">
              <input className="input !pr-12" type={show ? "text" : "password"} placeholder="รหัสผ่าน (8+ ตัว มีตัวเลข)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} maxLength={72} autoComplete="new-password" />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show}
                className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10">
                <Icon name={show ? "eyeoff" : "eye"} size={19} />
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
          <button disabled={busy} className="btn-primary">เพิ่มบัญชี</button>
        </form>
      )}
      {!isSuper && error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}

      <div className="flex flex-col gap-2">
        {users.map((u) => (
          <div key={u.id} className="card p-3 flex items-center gap-3 flex-wrap">
            <div className="min-w-0 flex-1 basis-40">
              <p className="font-semibold text-sm truncate">
                {u.displayName} {u.id === me.id && <span className="badge bg-brand-500/15 text-brand-700 dark:text-brand-200 ml-1">คุณ</span>} {u.isBanned && <span className="badge bg-red-500/15 text-red-700 dark:text-red-300 ml-1">ถูกระงับ</span>}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">{ROLE_LABEL[u.role]}</p>
            </div>
            {u.id !== me.id && (
              <div className="flex gap-1.5 shrink-0 flex-wrap">
                {isSuper && (
                  <select value={u.role} onChange={(e) => e.target.value !== u.role && changeRole(u, e.target.value)} className="input !py-1 !px-2 !w-auto text-xs" aria-label={`สิทธิ์ของ ${u.displayName}`}>
                    {u.role === "USER" && <option value="USER">สมาชิกเดิม</option>}
                    <option value="ADMIN">แอดมิน</option>
                    <option value="SUPER_ADMIN">ผู้ดูแลสูงสุด</option>
                  </select>
                )}
                <button onClick={() => toggleBan(u)} className="btn-ghost !py-1 !px-2.5 text-xs">{u.isBanned ? "ปลดระงับ" : "ระงับ"}</button>
                {isSuper && u.role !== "USER" && (
                  <button onClick={() => removeAdmin(u)} className="btn-danger !py-1 !px-2.5 text-xs">ถอดออกจาก Admin</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
