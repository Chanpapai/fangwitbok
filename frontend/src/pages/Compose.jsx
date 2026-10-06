import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getSavedProfile, saveProfile } from "../lib/guest";
import { useSite } from "../context/SiteContext";
import { ACCEPT, prepareImage } from "../lib/image";
import { parseSocialUrl } from "../lib/social";
import Icon from "../components/Icon";
import BrandIcon from "../components/BrandIcon";
import { useDialogs } from "../components/Dialogs";

const MAX_FILES = 5;

export default function Compose() {
  const navigate = useNavigate();
  const { site } = useSite();
  const { confirm } = useDialogs();
  const fileRef = useRef(null);
  const [identity, setIdentity] = useState(null); // null = ยังไม่เลือก | "named" | "anon"
  const [type, setType] = useState("ANNOUNCE");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState(""); // ช่องทางติดต่อกลับ (ไม่บังคับ): ลิงก์ Instagram/Facebook
  const contactCheck = parseSocialUrl(contact, ["INSTAGRAM", "FACEBOOK"]);

  useEffect(() => {
    const p = getSavedProfile();
    if (p.name) setName(p.name);
    if (p.className) setClassName(p.className);
  }, []);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  async function pickFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    setError("");
    const next = [...files];
    for (const f of picked) {
      if (next.length >= MAX_FILES) break;
      try { next.push(await prepareImage(f)); } // ตรวจชนิด (JPG/PNG/WebP/GIF) + ขนาด + ย่อรูป
      catch (err) { setError(err.message); }
    }
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  function removeFile(i) {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  // ขั้นที่ 1: ตรวจข้อมูล แล้วเปิดหน้ายืนยันก่อน (ส่งแล้วผู้ใช้ลบเองไม่ได้)
  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return setError("กรุณากรอกข้อความ");
    if (identity === "named" && !name.trim()) return setError("กรุณากรอกชื่อ");
    if (contactCheck.error) return setError(contactCheck.error);
    setError("");
    const ok = await confirm({
      title: "ยืนยันการส่งโพสต์", message: site.postConfirmMessage,
      confirmText: "ยืนยันส่งโพสต์", cancelText: "กลับไปแก้ไข", tone: "success", cancelTone: "danger",
    });
    if (ok) send();
  }

  // ขั้นที่ 2: ผู้ใช้กดยืนยัน จึงส่งโพสต์จริง
  async function send() {
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("type", type);
      form.append("content", content.trim());
      form.append("isAnonymous", identity === "anon" ? "true" : "false");
      if (identity === "named") {
        form.append("authorName", name.trim());
        if (className.trim()) form.append("authorClass", className.trim());
      }
      if (type === "LOST_FOUND" && location.trim()) form.append("location", location.trim());
      if (contactCheck.url) form.append("contactUrl", contactCheck.url); // Backend ตรวจซ้ำอีกชั้น
      form.append("website", website);
      files.forEach((f) => form.append("images", f));

      const data = await api.postForm("/api/posts", form);
      if (identity === "named") saveProfile(name.trim(), className.trim());
      navigate(`/post/${data.post.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "โพสต์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  // ขั้นที่ 1: เลือกว่าจะระบุตัวตนหรือไม่
  if (!identity) {
    return (
      <div className="relative z-10 max-w-xl mx-auto px-4 py-6 pb-28">
        <h1 className="font-bold text-xl">ฝากบอก</h1>
        <p className="text-sm text-slate-500 mt-1 mb-5">เลือกว่าจะแสดงตัวตนของคุณหรือไม่</p>
        <div className="grid gap-3">
          <button onClick={() => setIdentity("named")} className="card p-5 text-left flex items-start gap-4 hover:border-brand-400/60 transition">
            <span className="w-11 h-11 rounded-xl bg-brand-500/15 text-brand-500 dark:text-brand-300 flex items-center justify-center"><Icon name="user" size={22} /></span>
            <span>
              <span className="block font-semibold">ระบุตัวตน</span>
              <span className="block text-sm text-slate-500 mt-0.5">แสดงชื่อและชั้น/ห้องของคุณบนโพสต์</span>
            </span>
          </button>
          <button onClick={() => setIdentity("anon")} className="card p-5 text-left flex items-start gap-4 hover:border-brand-400/60 transition">
            <span className="w-11 h-11 rounded-xl bg-slate-500/15 text-slate-500 dark:text-slate-300 flex items-center justify-center"><Icon name="eyeoff" size={22} /></span>
            <span>
              <span className="block font-semibold">ไม่ระบุตัวตน</span>
              <span className="block text-sm text-slate-500 mt-0.5">ไม่แสดงชื่อ และระบบไม่เก็บชื่อหรือชั้นของคุณเลย</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 max-w-xl mx-auto px-4 py-4 pb-28">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl">สร้างโพสต์</h1>
        <button onClick={() => setIdentity(null)} className="chip chip-off flex items-center gap-1.5 !py-1 text-xs">
          <Icon name={identity === "anon" ? "eyeoff" : "user"} size={14} />
          {identity === "anon" ? "ไม่ระบุตัวตน" : "ระบุตัวตน"} · เปลี่ยน
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {[["ANNOUNCE", "ฝากบอก", "megaphone"], ["LOST_FOUND", "ตามหาของหาย", "search"]].map(([v, label, icon]) => (
          <button key={v} type="button" onClick={() => setType(v)}
            className={`py-2.5 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 transition ${type === v ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white border-transparent shadow shadow-brand-500/25" : "border-slate-200 dark:border-white/10 text-slate-500"}`}>
            <Icon name={icon} size={17} /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card p-4 flex flex-col gap-3">
        {identity === "named" && (
          <div className="grid grid-cols-5 gap-2">
            <input className="input col-span-3" placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" />
            <input className="input col-span-2" placeholder="ชั้น/ห้อง" value={className} onChange={(e) => setClassName(e.target.value)} maxLength={30} />
          </div>
        )}

        <textarea className="input" rows={5} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder={type === "LOST_FOUND" ? "อธิบายของที่หาย/เจอ ลักษณะ เวลา..." : "อยากฝากบอกอะไร..."} />
        <span className="text-xs text-slate-400 text-right -mt-2">{content.length}/2000</span>

        {type === "LOST_FOUND" && (
          <input className="input" placeholder="จุดที่พบ/ทำหาย (ไม่บังคับ)" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />
        )}

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-300 block mb-1.5" htmlFor="contact">ช่องทางติดต่อกลับ (ไม่บังคับ)</label>
          <div className="relative">
            <input id="contact" className={`input ${contactCheck.platform ? "!pl-12" : ""}`} placeholder="ลิงก์ Instagram หรือ Facebook" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={300} inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} />
            {contactCheck.platform && <span className="absolute left-3 top-1/2 -translate-y-1/2"><BrandIcon platform={contactCheck.platform} size={24} /></span>}
          </div>
          {contact.trim() && contactCheck.error && <p className="text-xs text-red-600 dark:text-red-300 mt-1">{contactCheck.error}</p>}
          {contactCheck.platform && <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">จะแสดงไอคอน {contactCheck.platform === "INSTAGRAM" ? "Instagram" : "Facebook"} ข้างโพสต์ ให้คนกดติดต่อกลับได้</p>}
        </div>

        {/* honeypot: คนจริงมองไม่เห็น บอทมักกรอก */}
        <input tabIndex={-1} autoComplete="off" aria-hidden="true" value={website} onChange={(e) => setWebsite(e.target.value)} className="absolute -left-[9999px] w-px h-px opacity-0" name="website" />

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 mb-2">รูปภาพ JPG, PNG, WebP, GIF (ไม่บังคับ สูงสุด {MAX_FILES} รูป)</p>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/10">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeFile(i)} aria-label="เอารูปออก" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><Icon name="close" size={14} /></button>
                </div>
              ))}
            </div>
          )}
          {files.length < MAX_FILES && (
            <button type="button" onClick={() => fileRef.current?.click()} className="btn-ghost text-sm"><Icon name="image" size={18} /> เลือกรูป</button>
          )}
          <input ref={fileRef} type="file" accept={ACCEPT} multiple hidden onChange={pickFiles} />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-3 text-base">{busy ? "กำลังโพสต์..." : "โพสต์"}</button>
        <p className="text-[11px] text-slate-500 dark:text-slate-300 text-center">โพสต์ที่ส่งแล้วลบเองไม่ได้ หากต้องการลบให้แจ้งแอดมิน (ปุ่ม “ติดต่อแอดมิน” มุมซ้ายล่าง)</p>
      </form>

    </div>
  );
}
