import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;
const MAX_FILES = 5;

export default function CreatePost() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [type, setType] = useState("ANNOUNCE");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [anon, setAnon] = useState(false);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    const combined = [...files, ...picked].slice(0, MAX_FILES);

    for (const f of picked) {
      if (!ALLOWED.includes(f.type)) return setError("รองรับเฉพาะไฟล์ JPG, PNG, WebP เท่านั้น");
      if (f.size > MAX_MB * 1024 * 1024) return setError(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_MB}MB ต่อไฟล์)`);
    }
    setError("");
    setFiles(combined);
    setPreviews(combined.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(i) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
    setPreviews((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return setError("กรุณากรอกข้อความ");
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("content", content.trim());
      form.append("isAnonymous", anon ? "true" : "false");
      if (type === "LOST_FOUND" && location.trim()) form.append("location", location.trim());
      files.forEach((f) => form.append("images", f));

      const data = await api.postForm("/api/posts", form);
      navigate(`/post/${data.post.id}`);
    } catch (err) {
      setError(err.message || "โพสต์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28">
      <h1 className="font-bold text-xl mb-4">✏️ สร้างโพสต์ใหม่</h1>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          ["ANNOUNCE", "📣 ฝากบอก"],
          ["LOST_FOUND", "🔍 ตามหาของหาย"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => setType(v)}
            className={`py-2.5 rounded-xl font-semibold text-sm border ${
              type === v ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card p-4 flex flex-col gap-3">
        <textarea
          className="input"
          rows={5}
          placeholder={type === "LOST_FOUND" ? "อธิบายของที่หาย/เจอ ลักษณะ จุดที่พบ..." : "อยากฝากบอกอะไร..."}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
        />
        <span className="text-xs text-slate-400 text-right -mt-2">{content.length}/2000</span>

        {type === "LOST_FOUND" && (
          <input className="input" placeholder="จุดที่พบ/ทำหาย (ไม่บังคับ)" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
        )}

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1.5">รูปภาพ (ไม่บังคับ, สูงสุด {MAX_FILES} รูป)</p>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeFile(i)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-xs">×</button>
                </div>
              ))}
            </div>
          )}
          {files.length < MAX_FILES && (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost text-xs">📷 เลือกรูป</button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={pickFiles} />
        </div>

        <label className="flex items-center gap-1.5 text-sm text-slate-500">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> โพสต์แบบไม่ระบุชื่อ
        </label>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-2.5">{busy ? "กำลังโพสต์..." : "โพสต์"}</button>
      </form>
    </div>
  );
}
