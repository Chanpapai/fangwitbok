import { useEffect, useRef, useState } from "react";
import { useProfile } from "../context/ProfileContext";
import { useTheme, ACCENTS } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ACCEPT } from "../lib/image";
import { parseSocialUrl } from "../lib/social";
import Avatar from "../components/Avatar";
import BrandIcon from "../components/BrandIcon";
import Icon from "../components/Icon";
import { useDialogs } from "../components/Dialogs";

// หน้าตั้งค่าสไตล์ iOS (รายการแบบกลุ่ม): โปรไฟล์ + ลิงก์ Instagram/Facebook + สีธีม (พร้อมตัวอย่างก่อนใช้)
const SWATCH = { default: "linear-gradient(135deg,#60a5fa,#6d5df6)", blue: "#2563eb", purple: "#7c3aed", pink: "#db2777", green: "#047857", orange: "#c2410c" };
const group = "rounded-[20px] bg-white/90 dark:bg-white/[0.07] border border-slate-200/80 dark:border-white/[0.08] overflow-hidden";
const label = "block px-1 pb-1.5 text-[13px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300";

export default function Settings() {
  const { profile, save, setAvatar, clearAvatar } = useProfile();
  const { user } = useAuth();
  const { dark, toggle, accent, setAccent } = useTheme();
  const { toast, confirm } = useDialogs();
  const file = useRef(null);
  const [form, setForm] = useState({ name: profile.name, className: profile.className, instagramUrl: profile.instagramUrl, facebookUrl: profile.facebookUrl });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(accent);

  // ข้อมูลโปรไฟล์ของบัญชีทีมงานโหลดช้ากว่าหน้าเว็บ: เติมลงฟอร์มเมื่อมาถึง (ไม่ทับสิ่งที่กำลังพิมพ์ถ้าแก้ไปแล้ว)
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) setForm({ name: profile.name, className: profile.className, instagramUrl: profile.instagramUrl, facebookUrl: profile.facebookUrl });
  }, [profile.name, profile.className, profile.instagramUrl, profile.facebookUrl]);
  const set = (k) => (e) => { touched.current = true; setForm((f) => ({ ...f, [k]: e.target.value })); };

  const ig = parseSocialUrl(form.instagramUrl, ["INSTAGRAM"]);
  const fb = parseSocialUrl(form.facebookUrl, ["FACEBOOK"]);

  async function saveProfile(e) {
    e.preventDefault();
    setBusy(true);
    try { await save(form); touched.current = false; toast("บันทึกโปรไฟล์แล้ว", "success"); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function pickAvatar(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try { await setAvatar(f); toast("เปลี่ยนรูปโปรไฟล์แล้ว", "success"); }
    catch (err) { toast(err.message, "error"); }
    finally { setBusy(false); }
  }
  async function removeAvatar() {
    const ok = await confirm({ title: "ลบรูปโปรไฟล์?", message: "จะกลับไปใช้รูปสำรอง (ตัวอักษรแรกของชื่อ)", confirmText: "ลบรูป", tone: "danger", icon: "trash" });
    if (!ok) return;
    try { await clearAvatar(); toast("ลบรูปโปรไฟล์แล้ว", "success"); } catch (err) { toast(err.message, "error"); }
  }

  const pendingLabel = ACCENTS.find((a) => a.id === pending)?.label;
  return (
    <div className="relative z-10 max-w-xl mx-auto px-4 pt-4 pb-[calc(7rem+env(safe-area-inset-bottom))] flex flex-col gap-6">
      <h1 className="font-bold text-[28px] leading-tight">ตั้งค่า</h1>

      {/* ---------- โปรไฟล์ ---------- */}
      <form onSubmit={saveProfile}>
        <span className={label}>โปรไฟล์</span>
        <div className={group}>
          <div className="p-4 flex items-center gap-4">
            <button type="button" onClick={() => file.current?.click()} disabled={busy} aria-label="เปลี่ยนรูปโปรไฟล์" className="relative rounded-full active:scale-95 transition">
              <Avatar src={profile.avatarUrl} name={form.name} size={76} />
              <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-brand-600 text-white ring-2 ring-white dark:ring-ink-800 flex items-center justify-center"><Icon name="image" size={14} /></span>
            </button>
            <input ref={file} type="file" accept={ACCEPT} hidden onChange={pickAvatar} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[17px] truncate">{profile.name || "ผู้เข้าชม"}</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-300">{profile.synced ? "บัญชีทีมงาน · ซิงค์กับทุกอุปกรณ์" : "เก็บไว้ในเครื่องนี้เท่านั้น"}</p>
              {profile.avatarUrl && <button type="button" onClick={removeAvatar} className="text-[14px] font-semibold text-red-700 dark:text-red-300 mt-1">ลบรูป</button>}
            </div>
          </div>

          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-slate-200/80 dark:border-white/[0.08] pt-4">
            {!user && (
              <div className="grid grid-cols-5 gap-2">
                <input className="input col-span-3" placeholder="ชื่อ" aria-label="ชื่อ" value={form.name} onChange={set("name")} maxLength={60} />
                <input className="input col-span-2" placeholder="ชั้น/ห้อง" aria-label="ชั้นหรือห้อง" value={form.className} onChange={set("className")} maxLength={30} />
              </div>
            )}
            {[["instagramUrl", "INSTAGRAM", "Instagram", "https://instagram.com/ชื่อบัญชี", ig], ["facebookUrl", "FACEBOOK", "Facebook", "https://facebook.com/ชื่อบัญชี", fb]].map(([key, platform, name, ph, chk]) => (
              <div key={key}>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2"><BrandIcon platform={platform} size={24} /></span>
                  <input className="input !pl-12" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={300} placeholder={`ลิงก์ ${name}`} aria-label={`ลิงก์ ${name}`} value={form[key]} onChange={set(key)} />
                </div>
                {form[key].trim() && chk.error && <p className="text-[13px] text-red-700 dark:text-red-300 mt-1 px-1">{chk.error}</p>}
                {chk.url && <a href={chk.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-700 dark:text-brand-300 mt-1 px-1"><Icon name="link" size={13} /> เปิดลิงก์เพื่อตรวจสอบ</a>}
                {!form[key].trim() && <p className="text-[12px] text-slate-600 dark:text-slate-300 mt-1 px-1">ตัวอย่าง {ph}</p>}
              </div>
            ))}
            <button disabled={busy || Boolean(ig.error || fb.error)} className="btn-primary w-full !rounded-[14px] !py-3 !text-[16px]">{busy ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}</button>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed text-slate-600 dark:text-slate-300 mt-2 px-1">
          ลิงก์เป็นข้อมูลส่วนตัวของคุณ ไม่แสดงให้ใครเห็น จนกว่าคุณจะเลือกแนบในโพสต์เอง (ระบบจะเติมให้ในช่อง “ช่องทางติดต่อกลับ” ตอนสร้างโพสต์) ·
          รูปโปรไฟล์ดึงจาก Instagram/Facebook อัตโนมัติไม่ได้ เพราะแพลตฟอร์มไม่อนุญาตให้เว็บอื่นอ่านรูปโดยไม่ได้รับสิทธิ์จากเจ้าของบัญชี จึงให้อัปโหลดรูปเอง — ถ้าไม่ใส่ ระบบใช้รูปสำรอง
        </p>
      </form>

      {/* ---------- ธีม ---------- */}
      <section aria-labelledby="theme-h">
        <span id="theme-h" className={label}>ธีมและสี</span>
        <div className={group}>
          <div className="p-4 flex items-center justify-between">
            <span className="font-semibold text-[16px]">โหมดมืด</span>
            <button type="button" role="switch" aria-checked={dark} aria-label="โหมดมืด" onClick={toggle}
              className={`relative w-[52px] h-[31px] rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${dark ? "bg-emerald-600" : "bg-slate-400"}`}>
              <span className={`absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow transition-all ${dark ? "left-[23px]" : "left-[2px]"}`} />
            </button>
          </div>

          <div className="px-4 pb-4 border-t border-slate-200/80 dark:border-white/[0.08] pt-4">
            <p className="font-semibold text-[16px] mb-3">สีหลัก</p>
            <div role="radiogroup" aria-label="เลือกสีหลัก" className="grid grid-cols-6 gap-2">
              {ACCENTS.map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={pending === a.id} aria-label={a.label} onClick={() => setPending(a.id)} className="flex flex-col items-center gap-1.5 outline-none group">
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center text-white ring-offset-2 ring-offset-white dark:ring-offset-ink-800 transition group-focus-visible:ring-2 ${pending === a.id ? "ring-2 ring-slate-900 dark:ring-white scale-105" : ""}`} style={{ background: SWATCH[a.id] }}>
                    {pending === a.id && <Icon name="check" size={20} strokeWidth={3} />}
                  </span>
                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{a.label}</span>
                </button>
              ))}
            </div>

            {/* ตัวอย่างก่อนใช้: กล่องนี้ใช้สีที่เลือกแยกจากหน้าเว็บจริง */}
            <div data-accent={pending} aria-label={`ตัวอย่างสี ${pendingLabel}`} className="mt-4 rounded-2xl p-4 bg-slate-50 dark:bg-ink-900/70 border border-slate-200 dark:border-white/10">
              <p className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mb-2">ตัวอย่าง · {pendingLabel}</p>
              <div className="flex flex-col gap-1.5">
                <div className="self-start max-w-[80%] px-3.5 py-2 rounded-[20px] rounded-bl-[6px] bg-slate-200 text-slate-900 dark:bg-white/[0.18] dark:text-white text-[16px] font-medium">สวัสดีครับ มีอะไรให้ช่วยไหม</div>
                <div className="self-end max-w-[80%] px-3.5 py-2 rounded-[20px] rounded-br-[6px] bg-brand-600 text-white text-[16px] font-medium">อยากฝากบอกเรื่องของหายค่ะ</div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="btn-primary pointer-events-none">ปุ่มหลัก</span>
                <span className="chip chip-on">ตัวเลือก</span>
                <span className="text-[15px] font-semibold text-brand-700 dark:text-brand-300 underline">ลิงก์</span>
                <span className="w-9 h-9 rounded-full bg-brand-500/15 text-brand-700 dark:text-brand-300 flex items-center justify-center"><Icon name="heart" size={18} fill /></span>
              </div>
            </div>

            <button type="button" disabled={pending === accent} onClick={() => { setAccent(pending); toast(`ใช้ธีม${pendingLabel}แล้ว`, "success"); }} className="btn-primary w-full mt-4 !rounded-[14px] !py-3 !text-[16px]">
              {pending === accent ? "กำลังใช้ธีมนี้อยู่" : `ใช้ธีม${pendingLabel}`}
            </button>
          </div>
        </div>
        <p className="text-[13px] text-slate-600 dark:text-slate-300 mt-2 px-1">ค่าที่เลือกจำไว้ในเครื่องนี้ และยังอยู่หลังรีเฟรช</p>
      </section>
    </div>
  );
}
