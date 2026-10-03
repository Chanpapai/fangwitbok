import { useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icon from "../components/Icon";

export default function Home() {
  const navigate = useNavigate();
  const taps = useRef({ n: 0, t: 0 });

  // จุดเข้าถึงสำหรับทีมงาน: แตะโลโก้ต่อเนื่อง 7 ครั้ง (หรือพิมพ์ /staff) — ไม่มีปุ่ม Admin บนหน้าจอ
  // หมายเหตุ: นี่เป็นแค่ความสะดวก ไม่ใช่ความปลอดภัย การเข้าหลังบ้านต้องผ่าน Login + สิทธิ์ที่ Backend เสมอ
  function onLogoTap() {
    const now = Date.now();
    taps.current = { n: now - taps.current.t < 1500 ? taps.current.n + 1 : 1, t: now };
    if (taps.current.n >= 7) { taps.current.n = 0; navigate("/staff"); }
  }

  return (
    <main className="relative z-10 min-h-[100dvh] flex flex-col items-center justify-center px-5 pb-40 pt-16">
      <button onClick={onLogoTap} className="outline-none" aria-label="FangwitBok V2" tabIndex={-1}>
        <img
          src="/logo.webp" alt="ฝากวิทฝากบอก FangwitBok.V2" width="720" height="480"
          className="w-[min(88vw,26rem)] h-auto animate-bob drop-shadow-[0_10px_40px_rgba(109,93,246,.45)] select-none" draggable={false}
        />
      </button>
      <p className="mt-6 text-center text-slate-500 dark:text-slate-300 text-[15px] leading-relaxed max-w-xs">
        ฝากบอกเรื่องราวและตามหาของหาย<br />ในโรงเรียนของเรา ไม่ต้องสมัคร ไม่ต้องเข้าสู่ระบบ
      </p>

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-50 via-slate-50/80 dark:from-[#080b18] dark:via-[#080b18]/80 to-transparent">
        <div className="max-w-sm mx-auto grid grid-cols-2 gap-3">
          <Link to="/feed" className="btn-ghost !py-3.5 !text-base border border-slate-200 dark:border-white/10">
            <Icon name="feed" size={20} /> ดูโพสต์
          </Link>
          <Link to="/new" className="btn-primary !py-3.5 !text-base">
            <Icon name="megaphone" size={20} /> ฝากบอก
          </Link>
        </div>
      </div>
    </main>
  );
}
