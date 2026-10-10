import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import { useSite } from "../context/SiteContext";

const CONTACT_META = {
  instagram: { label: "Instagram", icon: "instagram", tone: "text-pink-500" },
  facebook: { label: "Facebook", icon: "facebook", tone: "text-blue-500" },
  discord: { label: "Discord", icon: "discord", tone: "text-indigo-400" },
};

export default function Home() {
  const navigate = useNavigate();
  const taps = useRef({ n: 0, t: 0 });
  const { site, logo, customLogo } = useSite();
  const [showContacts, setShowContacts] = useState(false);
  const [installEvt, setInstallEvt] = useState(null); // ปุ่ม "ติดตั้งแอป" (Chrome/Android) โผล่เมื่อเบราว์เซอร์พร้อมให้ติดตั้ง
  const contacts = (site.contacts || []).filter((c) => CONTACT_META[c.key] && c.url);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (!installEvt) return;
    installEvt.prompt();
    await installEvt.userChoice.catch(() => {});
    setInstallEvt(null);
  }

  // จุดเข้าถึงสำหรับทีมงาน: แตะโลโก้ต่อเนื่อง 7 ครั้ง (หรือพิมพ์ /staff) — ไม่มีปุ่ม Admin บนหน้าจอ
  // หมายเหตุ: นี่เป็นแค่ความสะดวก ไม่ใช่ความปลอดภัย การเข้าหลังบ้านต้องผ่าน Login + สิทธิ์ที่ Backend เสมอ
  function onLogoTap() {
    const now = Date.now();
    taps.current = { n: now - taps.current.t < 1500 ? taps.current.n + 1 : 1, t: now };
    if (taps.current.n >= 7) { taps.current.n = 0; navigate("/staff"); }
  }

  return (
    <main className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 pb-48 pt-16">
      <button onClick={onLogoTap} className="outline-none" aria-label="FangwitBok V2" tabIndex={-1}>
        <img
          src={logo} alt="ฝากวิทฝากบอก FangwitBok.V2"
          {...(customLogo ? {} : { width: 720, height: 480 })}
          className="w-[min(88vw,26rem)] max-h-[44vh] object-contain h-auto animate-bob drop-shadow-[0_10px_40px_rgba(109,93,246,.45)] select-none" draggable={false}
        />
      </button>

      {/* ข้อความหลักหน้าแรก: Super Admin แก้ได้จากหลังบ้าน (ตั้งค่าหน้าเว็บไซต์) */}
      <h1 className="mt-7 text-center font-bold text-[1.65rem] sm:text-3xl leading-snug max-w-md whitespace-pre-line break-words text-slate-800 dark:text-white">
        <span className="bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent dark:from-sky-300 dark:to-violet-300">
          {site.homeHeadline}
        </span>
      </h1>

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50/80 dark:from-[#080b18] dark:via-[#080b18]/80 to-transparent">
        <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
          <Link to="/feed" className="btn-ghost !py-3.5 !text-base border border-slate-300 dark:border-white/20">
            <Icon name="feed" size={20} /> ดูโพสต์
          </Link>
          {/* ขอบสีขาว + เงาเรือง ให้ปุ่มแยกจากพื้นหลังชัดเจน แต่ยังคงธีมมินิมอล */}
          <Link to="/new" className="btn-primary !py-3.5 !text-base border-2 border-white/90 dark:border-white/70 ring-4 ring-brand-500/25">
            <Icon name="megaphone" size={20} /> ฝากบอก
          </Link>
        </div>
        {(contacts.length > 0 || installEvt) && (
          <div className="max-w-sm mx-auto mt-3 flex items-center justify-center gap-2">
            {contacts.length > 0 && (
              <button onClick={() => setShowContacts(true)} className="btn-ghost !py-2 text-sm border border-slate-300 dark:border-white/20">
                <Icon name="users" size={17} /> ช่องทางการติดต่อ
              </button>
            )}
            {installEvt && (
              <button onClick={install} className="btn-ghost !py-2 text-sm border border-slate-300 dark:border-white/20">
                <Icon name="install" size={17} /> ติดตั้งแอป
              </button>
            )}
          </div>
        )}
      </div>

      {showContacts && (
        <div className="fixed inset-0 z-50 bg-black/55 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowContacts(false)} role="dialog" aria-modal="true" aria-label="ช่องทางการติดต่อ">
          <div className="w-full sm:max-w-sm bg-white dark:bg-[#1b2350] text-slate-900 dark:text-slate-50 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-lg">ช่องทางการติดต่อ</p>
              <button onClick={() => setShowContacts(false)} aria-label="ปิด" className="btn-ghost !p-2"><Icon name="close" size={18} /></button>
            </div>
            <div className="flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom)]">
              {contacts.map((c) => {
                const m = CONTACT_META[c.key];
                return (
                  <a key={c.key} href={c.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-white/[0.06] px-4 py-3 font-semibold hover:bg-slate-100 dark:hover:bg-white/10">
                    <Icon name={m.icon} size={22} className={m.tone} />
                    <span className="flex-1">{m.label}</span>
                    <Icon name="right" size={16} className="text-slate-400" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
