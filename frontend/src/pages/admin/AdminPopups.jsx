import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useDialog } from "../../components/DialogProvider";
import Icon from "../../components/Icon";
import ImageUploader from "./ImageUploader";

const EMPTY = { title: "", body: "", images: [], order: 0, isActive: true }; // images: [{ path, url }]
const MAX_IMAGES = 10;

export default function AdminPopups() {
  const { confirm, notify } = useDialog();
  const [popups, setPopups] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() { api.get("/api/admin/popups").then((d) => setPopups(d.popups)); }
  useEffect(load, []);

  function startEdit(p) {
    setEditingId(p.id);
    setForm({ title: p.title, body: p.body, images: p.images, order: p.order, isActive: p.isActive });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const reset = () => { setEditingId(null); setForm(EMPTY); setError(""); };

  const addImage = ({ path, url }) => path && setForm((f) => (f.images.length >= MAX_IMAGES ? f : { ...f, images: [...f.images, { path, url }] }));
  const removeImage = (i) => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }));
  const moveImage = (i, d) => setForm((f) => {
    const j = i + d;
    if (j < 0 || j >= f.images.length) return f;
    const images = [...f.images];
    [images[i], images[j]] = [images[j], images[i]];
    return { ...f, images };
  });

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim() && !form.body.trim() && form.images.length === 0) return setError("ใส่หัวข้อ ข้อความ หรือรูปอย่างน้อย 1 อย่าง");
    setBusy(true); setError("");
    const payload = { title: form.title, body: form.body, images: form.images.map((i) => i.path), order: Number(form.order) || 0, isActive: form.isActive };
    try {
      if (editingId) await api.patch(`/api/admin/popups/${editingId}`, payload);
      else await api.post("/api/admin/popups", payload);
      notify(editingId ? "บันทึก Popup แล้ว" : "สร้าง Popup แล้ว", "success");
      reset(); load();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function toggleActive(p) {
    try { await api.patch(`/api/admin/popups/${p.id}`, { isActive: !p.isActive }); load(); } catch (err) { notify(err.message); }
  }
  async function remove(p) {
    const ok = await confirm({
      title: "ลบ Popup นี้ใช่ไหม?",
      message: `${p.title ? `“${p.title}”` : "Popup รูปภาพ"} และรูปทั้งหมดของ Popup นี้จะถูกลบถาวร`,
      confirmText: "ลบ Popup", tone: "danger",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/popups/${p.id}`);
      if (editingId === p.id) reset();
      load();
    } catch (err) { notify(err.message); }
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="card p-4 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name={editingId ? "edit" : "plus"} size={17} /> {editingId ? "แก้ไข Popup" : "สร้าง Popup ใหม่"}</p>
        <input className="input" placeholder="หัวข้อ (ไม่บังคับ)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={100} />
        <textarea className="input" rows={3} placeholder="ข้อความ (ไม่บังคับ)" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} maxLength={1000} />

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mb-1.5">รูปภาพ ({form.images.length}/{MAX_IMAGES}) · ใส่แค่รูปอย่างเดียวได้ รูปจะแสดงเต็มพื้นที่และกดดูเพิ่มไม่ได้</p>
          {form.images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
              {form.images.map((im, i) => (
                <div key={im.path} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-ink-900">
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-1 left-1 text-[10px] font-bold bg-black/60 text-white rounded-full px-1.5">{i + 1}</span>
                  <button type="button" onClick={() => removeImage(i)} aria-label="เอารูปออก" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><Icon name="close" size={13} /></button>
                  <div className="absolute bottom-1 inset-x-1 flex justify-between">
                    <button type="button" disabled={i === 0} onClick={() => moveImage(i, -1)} aria-label="เลื่อนไปก่อน" className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"><Icon name="left" size={13} /></button>
                    <button type="button" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} aria-label="เลื่อนไปหลัง" className="w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30"><Icon name="right" size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {form.images.length < MAX_IMAGES && (
            <ImageUploader folder="popups" multiple maxFiles={MAX_IMAGES - form.images.length} onChange={addImage} label="เพิ่มรูป (JPG, PNG, WebP, GIF)" />
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-sm">ลำดับ <input type="number" min="0" className="input !w-20" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> แสดงผล</label>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1">{editingId ? "บันทึก" : "สร้าง"}</button>
          {editingId && <button type="button" onClick={reset} className="btn-ghost">ยกเลิก</button>}
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {popups.map((p) => (
          <div key={p.id} className="card p-3 flex items-start gap-3">
            {p.images[0] && (
              <div className="relative shrink-0">
                <img src={p.images[0].url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                {p.images.length > 1 && <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-brand-500 text-white rounded-full px-1.5">{p.images.length}</span>}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">#{p.order} {p.title || (p.images.length ? "Popup รูปภาพ" : "(ไม่มีข้อความ)")} {!p.isActive && <span className="badge bg-slate-500/15 text-slate-600 dark:text-slate-300 ml-1">ปิดอยู่</span>}</p>
              {p.body && <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{p.body}</p>}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button onClick={() => toggleActive(p)} className="btn-ghost !py-1 !px-2.5 text-xs">{p.isActive ? "ปิด" : "เปิด"}</button>
              <button onClick={() => startEdit(p)} className="btn-ghost !py-1 !px-2.5 text-xs">แก้ไข</button>
              <button onClick={() => remove(p)} className="btn-danger !py-1 !px-2.5 text-xs" aria-label="ลบ"><Icon name="trash" size={14} /></button>
            </div>
          </div>
        ))}
        {popups.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มี Popup</p>}
      </div>
    </div>
  );
}
