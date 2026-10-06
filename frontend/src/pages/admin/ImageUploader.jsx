import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { ACCEPT, prepareImage } from "../../lib/image";
import Icon from "../../components/Icon";

// อัปโหลดรูปของ Admin (กฎ/Popup) ขึ้น Supabase Storage ผ่าน Backend — คืน { path, url }
export default function ImageUploader({ folder, value, previewUrl, onChange, label = "อัปโหลดรูป" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setError("");
    try {
      const small = await prepareImage(f);
      const form = new FormData();
      form.append("image", small);
      const d = await api.postForm(`/api/admin/upload/${folder}`, form);
      onChange({ path: d.path, url: d.url });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div>
      {(previewUrl || value) && previewUrl && (
        <div className="relative mb-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-ink-900">
          <img src={previewUrl} alt="" className="w-full max-h-48 object-contain" />
          <button type="button" onClick={() => onChange({ path: null, url: null })} aria-label="เอารูปออก" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><Icon name="close" size={14} /></button>
        </div>
      )}
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-ghost text-sm"><Icon name="image" size={17} /> {busy ? "กำลังอัปโหลด..." : previewUrl ? "เปลี่ยนรูป" : label}</button>
      <input ref={ref} type="file" accept={ACCEPT} hidden onChange={pick} />
      {error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>}
    </div>
  );
}
