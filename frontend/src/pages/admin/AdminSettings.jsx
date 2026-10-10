import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSite } from "../../context/SiteContext";
import Icon from "../../components/Icon";
import ImageUploader from "./ImageUploader";

// ตั้งค่าหน้าเว็บไซต์ — เฉพาะ Super Admin (Backend ตรวจสิทธิ์ซ้ำทุกครั้ง)
// ข้อความเก็บในฐานข้อมูล รูปเก็บใน Supabase Storage จึงไม่หายเมื่อ Deploy เวอร์ชันใหม่
export default function AdminSettings() {
  const { user } = useAuth();
  const { refresh } = useSite();
  const [loaded, setLoaded] = useState(false);
  const [defaults, setDefaults] = useState({});
  const [headline, setHeadline] = useState("");
  const [confirmMsg, setConfirmMsg] = useState("");
  const [logo, setLogo] = useState({ path: null, url: null });
  const [profile, setProfile] = useState({ path: null, url: null });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  const isSuper = user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isSuper) return;
    api.get("/api/admin/settings").then(({ settings, defaults: d }) => {
      setDefaults(d);
      setHeadline(settings.homeHeadline);
      setConfirmMsg(settings.postConfirmMessage);
      setLogo({ path: settings.logoPath, url: settings.logoUrl });
      setProfile({ path: settings.profilePath, url: settings.profileUrl });
      setLoaded(true);
    }).catch((e) => setMsg({ ok: "", err: e.message }));
  }, [isSuper]);

  if (!isSuper) {
    return (
      <div className="card-post p-6 text-center">
        <Icon name="lock" size={30} className="mx-auto mb-2 text-slate-600 dark:text-slate-300" />
        <p className="font-bold">เฉพาะ Super Admin</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">การตั้งค่าหน้าเว็บไซต์แก้ไขได้เฉพาะ Super Admin เท่านั้น</p>
      </div>
    );
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg({ ok: "", err: "" });
    try {
      await api.put("/api/admin/settings", {
        homeHeadline: headline,
        postConfirmMessage: confirmMsg,
        logoPath: logo.path || null, // null = ใช้โลโก้เดิมของระบบ
        profilePath: profile.path || null,
      });
      await refresh(true); // อัปเดตหน้าเว็บที่เปิดอยู่ทันที
      setMsg({ ok: "บันทึกเรียบร้อย — หน้าเว็บอัปเดตแล้ว", err: "" });
    } catch (err) {
      setMsg({ ok: "", err: err.message });
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <div className="card-post p-4 skeleton h-48" />;

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <section className="card-post p-4 pt-5 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name="text" size={17} /> ข้อความหลักหน้าแรก</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">แสดงเป็นข้อความเด่นใต้โลโก้ในหน้าแรก (ขึ้นบรรทัดใหม่ได้)</p>
        <textarea className="input" rows={3} maxLength={200} value={headline} onChange={(e) => setHeadline(e.target.value)} required />
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
          <button type="button" onClick={() => setHeadline(defaults.homeHeadline)} className="underline">ใช้ข้อความเริ่มต้น</button>
          <span>{headline.length}/200</span>
        </div>
        <div className="rounded-xl bg-slate-100 dark:bg-white/[0.07] p-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-300 mb-1">ตัวอย่าง</p>
          <p className="text-center font-bold text-lg whitespace-pre-line break-words bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-transparent">{headline || " "}</p>
        </div>
      </section>

      <section className="card-post p-4 pt-5 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name="flag" size={17} /> ข้อความยืนยันก่อนส่งโพสต์</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">แสดงใน Popup เมื่อผู้ใช้กดโพสต์ ก่อนที่โพสต์จะถูกส่งจริง</p>
        <textarea className="input" rows={3} maxLength={500} value={confirmMsg} onChange={(e) => setConfirmMsg(e.target.value)} required />
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
          <button type="button" onClick={() => setConfirmMsg(defaults.postConfirmMessage)} className="underline">ใช้ข้อความเริ่มต้น</button>
          <span>{confirmMsg.length}/500</span>
        </div>
      </section>

      <section className="card-post p-4 pt-5 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name="image" size={17} /> โลโก้เว็บไซต์</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">ใช้ที่หน้าแรก แถบด้านบน พื้นหลังลอย และหน้าเข้าสู่ระบบทีมงาน แนะนำไฟล์ PNG พื้นโปร่งใส (JPG, PNG, WebP ไม่เกิน 5MB) ถ้าเอารูปออกจะกลับไปใช้โลโก้เดิมของระบบ</p>
        <ImageUploader folder="site" value={logo.path} previewUrl={logo.url} onChange={setLogo} label="อัปโหลดโลโก้ใหม่" />
      </section>

      <section className="card-post p-4 pt-5 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name="user" size={17} /> รูป Profile ประจำเว็บไซต์</p>
        <p className="text-xs text-slate-600 dark:text-slate-300">ใช้เป็นไอคอนของเว็บบนแท็บเบราว์เซอร์ (แนะนำรูปสี่เหลี่ยมจัตุรัส) ถ้าไม่ตั้งจะใช้โลโก้แทน</p>
        <ImageUploader folder="site" value={profile.path} previewUrl={profile.url} onChange={setProfile} label="อัปโหลดรูป Profile" />
      </section>

      {msg.err && <p className="text-sm text-red-500">{msg.err}</p>}
      {msg.ok && <p className="text-sm text-emerald-600 dark:text-emerald-300">{msg.ok}</p>}
      <button disabled={busy} className="btn-primary w-full py-3 text-base sticky bottom-3">{busy ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</button>
    </form>
  );
}
