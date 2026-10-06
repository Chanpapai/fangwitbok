import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { ACCEPT, prepareImage } from "../../lib/image";
import Icon from "../../components/Icon";

// อัปโหลดหลายรูป (Popup): เลือกได้ครั้งละหลายไฟล์ เรียงลำดับ/ลบได้ — items = [{ path, url }]
export default function MultiImageUploader({ folder, items, onChange, max = 8 }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e) {
    const picked = Array.from(e.target.files || []).slice(0, Math.max(0, max - items.length));
    e.target.value = "";
    if (!picked.length) return;
    setBusy(true); setError("");
    const next = [...items];
    try {
      for (const f of picked) {
        const small = await prepareImage(f);
        const form = new FormData();
        form.append("image", small);
        const d = await api.postForm(`/api/admin/upload/${folder}`, form);
        next.push({ path: d.path, url: d.url });
        onChange([...next]); // แสดงทีละรูปทันทีที่อัปโหลดเสร็จ
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  const remove = (i) => onChange(items.filter((_, k) => k !== i));
  const mini = "w-7 h-7 rounded-full bg-black/65 text-white flex items-center justify-center disabled:opacity-30";

  return (
    <div>
      {items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
          {items.map((im, i) => (
            <div key={im.path} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-ink-900">
              <img src={im.url} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 text-[11px] font-bold bg-black/65 text-white rounded-full px-2 py-0.5">{i + 1}</span>
              <button type="button" onClick={() => remove(i)} aria-label="เอารูปออก" className={`${mini} absolute top-1 right-1`}><Icon name="close" size={14} /></button>
              <div className="absolute bottom-1 inset-x-1 flex justify-between">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="ย้ายไปก่อนหน้า" className={mini}><Icon name="left" size={14} /></button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="ย้ายไปถัดไป" className={mini}><Icon name="right" size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length < max && (
        <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-ghost text-sm">
          <Icon name="image" size={17} /> {busy ? "กำลังอัปโหลด..." : items.length ? "เพิ่มรูป" : "เพิ่มรูป (JPG, PNG, WebP, GIF)"}
        </button>
      )}
      <span className="text-xs text-slate-500 dark:text-slate-300 ml-2">{items.length}/{max} รูป</span>
      <input ref={ref} type="file" accept={ACCEPT} multiple hidden onChange={pick} />
      {error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>}
    </div>
  );
}
