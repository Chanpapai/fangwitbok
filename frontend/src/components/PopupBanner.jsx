import { useEffect, useState } from "react";
import { api } from "../lib/api";

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

  if (closed || popups.length === 0 || index >= popups.length) return null;
  const popup = popups[index];
  const last = index + 1 >= popups.length;

  function next() {
    if (!last) setIndex((i) => i + 1);
    else { markSeen(popups.map((p) => p.id)); setClosed(true); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-5 animate-popin !bg-white dark:!bg-ink-800">
        {popup.imageUrl && (
          <img src={popup.imageUrl} alt="" className="rounded-xl w-full max-h-64 object-contain bg-slate-100 dark:bg-ink-900 mb-3" />
        )}
        <p className="font-bold text-lg">{popup.title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{popup.body}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">{popups.length > 1 ? `${index + 1} / ${popups.length}` : ""}</span>
          <button onClick={next} className="btn-primary">{last ? "รับทราบ" : "ถัดไป"}</button>
        </div>
      </div>
    </div>
  );
}
