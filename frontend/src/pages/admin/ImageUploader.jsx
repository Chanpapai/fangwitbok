import { useRef, useState } from "react";
import { api } from "../../lib/api";
import { ACCEPT_ATTR, MAX_BYTES, TYPE_ERROR, isAllowedImage, shrinkImage } from "../../lib/image";
import Icon from "../../components/Icon";

// อัปโหลดรูปของ Admin (กฎ/Popup) ขึ้น Supabase Storage ผ่าน Backend — คืน { path, url }
// multiple: เลือกได้หลายไฟล์ในครั้งเดียว (เรียก onChange ต่อรูป) และไม่แสดงตัวอย่างรูปในตัว (ให้หน้าที่เรียกจัดการเอง)
export default function ImageUploader({ folder, value, previewUrl, onChange, label = "อัปโหลดรูป", multiple = false, maxFiles = 10 }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(e) {
    const files = Array.from(e.target.files || []).slice(0, multiple ? maxFiles : 1);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      for (const f of files) {
        if (!isAllowedImage(f)) throw new Error(TYPE_ERROR);
        const small = await shrinkImage(f);
        if (small.size > MAX_BYTES) throw new Error("ไฟล์ใหญ่เกิน 5MB");
        const form = new FormData();
        form.append("image", small);
        const d = await api.postForm(`/api/admin/upload/${folder}`, form);
        onChange({ path: d.path, url: d.url });
      }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <div>
      {!multiple && previewUrl && (
        <div className="relative mb-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-ink-900">
          <img src={previewUrl} alt="" className="w-full max-h-48 object-contain" />
          <button type="button" onClick={() => onChange({ path: null, url: null })} aria-label="เอารูปออก" className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"><Icon name="close" size={14} /></button>
        </div>
      )}
      <button type="button" disabled={busy} onClick={() => ref.current?.click()} className="btn-ghost text-sm"><Icon name="image" size={17} /> {busy ? "กำลังอัปโหลด..." : !multiple && previewUrl ? "เปลี่ยนรูป" : label}</button>
      <input ref={ref} type="file" accept={ACCEPT_ATTR} multiple={multiple} hidden onChange={pick} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
