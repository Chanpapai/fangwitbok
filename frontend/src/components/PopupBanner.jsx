import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ImageCarousel from "./ImageCarousel";
import Icon from "./Icon";

const SEEN_KEY = "fwb_popups_seen";

function getSeen() {
  try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
function markSeen(ids) {
  try {
    const seen = getSeen();
    ids.forEach((id) => seen.add(id));
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch { /* ไม่เป็นไร */ }
}

// Popup สไตล์ iOS: มุมโค้งใหญ่ เงานุ่ม ขยายขึ้นแบบสปริง ฉากหลังเบลอ ปุ่มปิดชัดเจน (มุมขวาบน + ปุ่มหลักด้านล่าง)
// เนื้อหาเลื่อนได้ภายในกล่อง จึงไม่ล้นจอเล็ก และเว้นขอบตาม Safe Area/คีย์บอร์ด/แถบระบบเสมอ
// หัวข้อ/ข้อความไม่บังคับ — มีเฉพาะรูปก็ได้ และรูปใน Popup กดเพื่อขยายไม่ได้ (ไม่ส่ง onOpen ให้ ImageCarousel)
export default function PopupBanner() {
  const [popups, setPopups] = useState([]);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    api.get("/api/popups")
      .then((data) => {
        const seen = getSeen();
        // แสดงเฉพาะ popup ที่ยังไม่ปิดในแท็บนี้ — รีเฟรชซ้ำจะไม่มาบังจอซ้ำ
        setPopups((data.popups || []).filter((p) => !seen.has(p.id)));
      })
      .catch(() => {});
  }, []);

  const visible = !closed && popups.length > 0 && index < popups.length;

  function closeAll() { markSeen(popups.map((p) => p.id)); setClosed(true); }

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const k = (e) => e.key === "Escape" && closeAll();
    window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", k); };
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;
  const popup = popups[index];
  const last = index + 1 >= popups.length;
  const hasText = Boolean(popup.title || popup.body);
  const images = (popup.images || []).map((url) => ({ url }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-md animate-scrim"
      style={{ padding: "max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))" }}
      role="dialog" aria-modal="true" aria-label={popup.title || "ประกาศ"}
    >
      <div key={popup.id} className="relative w-full max-w-sm max-h-full flex flex-col overflow-hidden rounded-[28px] bg-white text-slate-900 dark:bg-[#1b2350] dark:text-slate-50 shadow-[0_28px_70px_-14px_rgba(0,0,0,.6)] ring-1 ring-black/10 dark:ring-white/10 animate-ios-pop">
        <button onClick={closeAll} aria-label="ปิดประกาศ" className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-black/60 text-white backdrop-blur flex items-center justify-center shadow-md hover:bg-black/75 active:scale-90 transition outline-none focus-visible:ring-2 focus-visible:ring-white">
          <Icon name="close" size={20} strokeWidth={2.4} />
        </button>

        <div className="min-h-0 overflow-y-auto overscroll-contain">
          {images.length > 0 && <ImageCarousel images={images} natural label="รูปประกาศ" />}
          {hasText && (
            <div className={`px-6 ${images.length ? "pt-4" : "pt-12"} pb-1`}>
              {popup.title && <p className="font-bold text-[20px] leading-snug break-words">{popup.title}</p>}
              {popup.body && <p className={`text-[16px] leading-[1.65] text-slate-700 dark:text-slate-200 whitespace-pre-line break-words ${popup.title ? "mt-2" : ""}`}>{popup.body}</p>}
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pt-3 pb-5">
          {popups.length > 1 && <p className="text-center text-[13px] text-slate-600 dark:text-slate-300 mb-2">{index + 1} / {popups.length}</p>}
          <button onClick={() => (last ? closeAll() : setIndex((i) => i + 1))} autoFocus className="btn-primary w-full !rounded-[14px] !py-3 !text-[16px]">
            {last ? "รับทราบ" : "ถัดไป"}
          </button>
        </div>
      </div>
    </div>
  );
}
