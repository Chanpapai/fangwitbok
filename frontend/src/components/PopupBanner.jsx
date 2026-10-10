import { useEffect, useMemo, useState } from "react";
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

  const popup = popups[index];
  const images = useMemo(() => (popup?.images || []).map((url) => ({ url })), [popup]);

  if (closed || !popup) return null;
  const last = index + 1 >= popups.length;
  const imageOnly = images.length > 0 && !popup.title && !popup.body;

  function next() {
    if (!last) setIndex((i) => i + 1);
    else { markSeen(popups.map((p) => p.id)); setClosed(true); }
  }

  const footer = (
    <div className={`flex items-center justify-between ${imageOnly ? "mt-3" : "mt-4"}`}>
      <span className={`text-xs ${imageOnly ? "text-white/80" : "text-slate-500 dark:text-slate-300"}`}>{popups.length > 1 ? `${index + 1} / ${popups.length}` : ""}</span>
      <button onClick={next} className="btn-primary">{last ? "รับทราบ" : "ถัดไป"}</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {imageOnly ? (
        // Popup ที่มีแต่รูป: รูปเต็มพื้นที่ ไม่มีกรอบการ์ด และกดรูปเพื่อเปิดดูเพิ่มไม่ได้
        <div className="w-full max-w-sm animate-popin" key={popup.id}>
          <ImageCarousel images={images} rounded="rounded-2xl" maxHeight="max-h-[78dvh]" className="!border-0 !bg-transparent shadow-2xl" />
          {footer}
        </div>
      ) : (
        <div className="card w-full max-w-sm p-5 animate-popin !bg-white dark:!bg-ink-800" key={popup.id}>
          {images.length > 0 && <ImageCarousel images={images} className="mb-3" maxHeight="max-h-72" />}
          {popup.title && <p className="font-bold text-lg">{popup.title}</p>}
          {popup.body && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{popup.body}</p>}
          {footer}
        </div>
      )}
    </div>
  );
}
