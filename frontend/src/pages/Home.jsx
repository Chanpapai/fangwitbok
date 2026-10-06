import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";
import BrandIcon from "../components/BrandIcon";
import { useSite } from "../context/SiteContext";
import { safeSocialUrl, SOCIAL_LABEL } from "../lib/social";

// รายการ "ช่องทางการติดต่อ": แสดงเฉพาะที่ Admin เปิดไว้ + ลิงก์ผ่านการตรวจซ้ำฝั่งหน้าเว็บ (กันค่าแปลกปลอมก่อนใส่ href)
function ContactSheet({ items, onClose }) {
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="ช่องทางการติดต่อ" className="w-full max-w-sm rounded-2xl bg-white text-slate-900 dark:bg-[#1b2350] dark:text-slate-50 border border-slate-200 dark:border-white/15 shadow-2xl p-4 animate-sheet">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-lg">ช่องทางการติดต่อ</p>
          <button onClick={onClose} aria-label="ปิด" className="w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center"><Icon name="close" size={18} /></button>
        </div>
        <div className="flex flex-col gap-2.5">
          {items.map((c) => (
            <a key={c.platform} href={c.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.07] hover:bg-slate-100 dark:hover:bg-white/[0.12] font-semibold text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
              <BrandIcon platform={c.platform} size={30} />
              <span className="flex-1">{SOCIAL_LABEL[c.platform]}</span>
              <Icon name="right" size={18} className="text-slate-500 dark:text-slate-300" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const taps = useRef({ n: 0, t: 0 });
  const { site, logo, customLogo } = useSite();
  const [contactOpen, setContactOpen] = useState(false);

  const contacts = (site.contacts || [])
    .map((c) => ({ platform: c.platform, url: safeSocialUrl(c.url, [c.platform]) }))
    .filter((c) => c.url);

  // จุดเข้าถึงสำหรับทีมงาน: แตะโลโก้ต่อเนื่อง 7 ครั้ง (หรือพิมพ์ /staff) — ไม่มีปุ่ม Admin บนหน้าจอ
  // หมายเหตุ: นี่เป็นแค่ความสะดวก ไม่ใช่ความปลอดภัย การเข้าหลังบ้านต้องผ่าน Login + สิทธิ์ที่ Backend เสมอ
  function onLogoTap() {
    const now = Date.now();
    taps.current = { n: now - taps.current.t < 1500 ? taps.current.n + 1 : 1, t: now };
    if (taps.current.n >= 7) { taps.current.n = 0; navigate("/staff"); }
  }

  return (
    <main className={`relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 pt-16 ${contacts.length ? "pb-52" : "pb-40"}`}>
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
          {/* ขอบหนา + พื้นทึบ ให้ปุ่มแยกจากพื้นหลังชัดเจน แต่ยังคงธีมมินิมอล */}
          <Link to="/feed" className="btn-ghost !py-3.5 !text-base border-2 border-slate-400 dark:border-white/40 !bg-white dark:!bg-white/10 shadow-md">
            <Icon name="feed" size={20} /> ดูโพสต์
          </Link>
          <Link to="/new" className="btn-primary !py-3.5 !text-base border-2 border-brand-700 dark:border-white shadow-xl shadow-brand-500/40">
            <Icon name="megaphone" size={20} /> ฝากบอก
          </Link>
        </div>
        {contacts.length > 0 && (
          <div className="max-w-sm mx-auto mt-2.5">
            <button onClick={() => setContactOpen(true)} className="btn-ghost w-full !py-2.5 border border-slate-300 dark:border-white/25">
              <span className="flex -space-x-1.5">{contacts.map((c) => <BrandIcon key={c.platform} platform={c.platform} size={20} className="ring-2 ring-slate-100 dark:ring-[#1c2444] rounded-md" />)}</span>
              ช่องทางการติดต่อ
            </button>
          </div>
        )}
      </div>

      {contactOpen && <ContactSheet items={contacts} onClose={() => setContactOpen(false)} />}
    </main>
  );
}
