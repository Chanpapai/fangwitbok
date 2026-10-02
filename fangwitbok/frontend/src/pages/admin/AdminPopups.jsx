import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const EMPTY = { title: "", body: "", imageUrl: "", order: 0, isActive: true };

export default function AdminPopups() {
  const [popups, setPopups] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get("/api/admin/popups").then((data) => setPopups(data.popups));
  }
  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, body: p.body, imageUrl: p.imageUrl || "", order: p.order, isActive: p.isActive });
  }
  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editingId) await api.patch(`/api/admin/popups/${editingId}`, form);
      else await api.post("/api/admin/popups", form);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p) {
    await api.patch(`/api/admin/popups/${p.id}`, { isActive: !p.isActive });
    load();
  }

  async function remove(id) {
    if (!confirm("ลบ Popup นี้ใช่ไหม?")) return;
    await api.del(`/api/admin/popups/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="card p-4 flex flex-col gap-2.5">
        <p className="font-bold">{editingId ? "แก้ไข Popup" : "➕ สร้าง Popup ใหม่"}</p>
        <input className="input" placeholder="หัวข้อ" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={100} />
        <textarea className="input" rows={3} placeholder="เนื้อหา" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required maxLength={1000} />
        <input className="input" placeholder="URL รูปภาพ (ไม่บังคับ)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            ลำดับ <input type="number" className="input !w-20" value={form.order} onChange={(e) => setForm({ ...form, order: +e.target.value })} />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> เปิดใช้งาน
          </label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1">{editingId ? "บันทึก" : "สร้าง"}</button>
          {editingId && <button type="button" onClick={resetForm} className="btn-ghost">ยกเลิก</button>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {popups.map((p) => (
          <div key={p.id} className="card p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">#{p.order} {p.title} {!p.isActive && <span className="badge bg-slate-200 dark:bg-slate-700 ml-1">ปิดอยู่</span>}</p>
              <p className="text-xs text-slate-500 line-clamp-2">{p.body}</p>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => toggleActive(p)} className="btn-ghost !py-1 !px-2 text-xs">{p.isActive ? "ปิด" : "เปิด"}</button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-1 !px-2 text-xs">แก้ไข</button>
              <button onClick={() => remove(p.id)} className="btn-danger !py-1 !px-2 text-xs">ลบ</button>
            </div>
          </div>
        ))}
        {popups.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มี Popup</p>}
      </div>
    </div>
  );
}
