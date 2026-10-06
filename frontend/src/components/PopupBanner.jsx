import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ImageCarousel from "./ImageCarousel";

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

// Popup: หัวข้อ/ข้อความไม่บังคับ — มีเฉพาะรูปก็ได้ (รูปเต็มความกว้างกล่อง ไม่มีขอบ) หลายรูปเลื่อนเป็น Carousel
// รูปใน Popup "กดเพื่อเปิดดูเพิ่มเติมไม่ได้" (ไม่ส่ง onOpen ให้ ImageCarousel)
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

  if (closed || popups.length === 0 || index >= popups.length) return null;
  const popup = popups[index];
  const last = index + 1 >= popups.length;
  const hasText = Boolean(popup.title || popup.body);
  const images = (popup.images || []).map((url) => ({ url }));

  function next() {
    if (!last) setIndex((i) => i + 1);
    else { markSeen(popups.map((p) => p.id)); setClosed(true); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={popup.title || "ประกาศ"}>
      <div key={popup.id} className="w-full max-w-sm max-h-[92dvh] overflow-y-auto rounded-2xl bg-white text-slate-900 dark:bg-[#1b2350] dark:text-slate-50 shadow-2xl animate-popin">
        {images.length > 0 && <ImageCarousel images={images} natural label="รูปประกาศ" />}
        {hasText && (
          <div className="px-5 pt-4">
            {popup.title && <p className="font-bold text-lg break-words">{popup.title}</p>}
            {popup.body && <p className={`text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line break-words ${popup.title ? "mt-1" : ""}`}>{popup.body}</p>}
          </div>
        )}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-xs text-slate-500 dark:text-slate-300">{popups.length > 1 ? `${index + 1} / ${popups.length}` : ""}</span>
          <button onClick={next} className="btn-primary" autoFocus>{last ? "รับทราบ" : "ถัดไป"}</button>
        </div>
      </div>
    </div>
  );
}
