import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Icon from "../../components/Icon";
import { useDialogs } from "../../components/Dialogs";
import MultiImageUploader from "./MultiImageUploader";

const EMPTY = { title: "", body: "", images: [], order: 0, isActive: true };

// Popup: หัวข้อ/ข้อความไม่บังคับ (มีเฉพาะรูปได้) · รูปได้หลายรายการ เรียงลำดับได้ · เก็บใน DB + Supabase Storage
export default function AdminPopups() {
  const { confirm, toast } = useDialogs();
  const [popups, setPopups] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() { api.get("/api/admin/popups").then((d) => setPopups(d.popups)).catch((e) => toast(e.message, "error")); }
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, body: p.body, images: p.imagePaths.map((path, i) => ({ path, url: p.images[i] })), order: p.order, isActive: p.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const reset = () => { setEditingId(null); setForm(EMPTY); setError(""); };
  const empty = !form.title.trim() && !form.body.trim() && form.images.length === 0;

  async function submit(e) {
    e.preventDefault();
    if (empty) return setError("Popup ต้องมีอย่างน้อยหนึ่งอย่าง: หัวข้อ ข้อความ หรือรูปภาพ");
    setBusy(true); setError("");
    const payload = { title: form.title, body: form.body, images: form.images.map((i) => i.path), order: Number(form.order) || 0, isActive: form.isActive };
    try {
      if (editingId) await api.patch(`/api/admin/popups/${editingId}`, payload);
      else await api.post("/api/admin/popups", payload);
      toast(editingId ? "บันทึก Popup แล้ว" : "สร้าง Popup แล้ว", "success");
      reset(); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function toggleActive(p) {
    try { await api.patch(`/api/admin/popups/${p.id}`, { isActive: !p.isActive }); load(); } catch (err) { toast(err.message, "error"); }
  }
  async function remove(p) {
    const ok = await confirm({
      title: "ลบ Popup นี้?", message: `${p.title ? `"${p.title}"\n` : ""}รูปทั้งหมดของ Popup จะถูกลบออกจากที่เก็บด้วย และกู้คืนไม่ได้`,
      confirmText: "ลบ Popup", tone: "danger", icon: "trash",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/popups/${p.id}`);
      if (editingId === p.id) reset();
      load();
    } catch (err) { toast(err.message, "error"); }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="card p-4 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name={editingId ? "edit" : "plus"} size={17} /> {editingId ? "แก้ไข Popup" : "สร้าง Popup ใหม่"}</p>
        <input className="input" placeholder="หัวข้อ (ไม่บังคับ)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
        <textarea className="input" rows={3} placeholder="ข้อความ (ไม่บังคับ)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} />
        <MultiImageUploader folder="popups" items={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} />
        <p className="text-xs text-slate-600 dark:text-slate-300">ใส่เฉพาะรูปได้ — รูปจะแสดงเต็มพื้นที่ Popup ผู้เข้าชมกดรูปเพื่อขยายไม่ได้ ถ้ามีหลายรูปจะเลื่อนอัตโนมัติ</p>
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm">ลำดับ <input type="number" min="0" className="input !w-20" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> แสดงผล</label>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1">{editingId ? "บันทึก" : "สร้าง"}</button>
          {editingId && <button type="button" onClick={reset} className="btn-ghost">ยกเลิก</button>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {popups.map((p) => (
          <div key={p.id} className="card p-3 flex items-start gap-3">
            {p.images[0] && (
              <span className="relative shrink-0">
                <img src={p.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                {p.images.length > 1 && <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-black/75 text-white rounded-full px-1.5">{p.images.length}</span>}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">#{p.order} {p.title || (p.body ? "(ไม่มีหัวข้อ)" : "(เฉพาะรูปภาพ)")} {!p.isActive && <span className="badge bg-slate-500/15 text-slate-600 dark:text-slate-300 ml-1">ปิดอยู่</span>}</p>
              {p.body && <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{p.body}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => toggleActive(p)} className="btn-ghost !py-1 !px-2.5 text-xs">{p.isActive ? "ปิด" : "เปิด"}</button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-1 !px-2.5 text-xs">แก้ไข</button>
              <button onClick={() => remove(p)} className="btn-danger !py-1 !px-2.5 text-xs" aria-label="ลบ"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
        {popups.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300 text-center py-4">ยังไม่มี Popup</p>}
      </div>
    </div>
  );
}
