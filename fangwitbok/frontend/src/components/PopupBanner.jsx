import { useEffect, useState } from "react";
import { api } from "../lib/api";

const SEEN_KEY = "fwb_popups_seen";

function getSeen() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markSeen(ids) {
  const seen = getSeen();
  ids.forEach((id) => seen.add(id));
  sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export default function PopupBanner() {
  const [popups, setPopups] = useState([]);
  const [index, setIndex] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    api
      .get("/api/popups")
      .then((data) => {
        const seen = getSeen();
        // แสดงเฉพาะ popup ที่ยังไม่เคยปิดในแท็บ/เซสชันนี้ — รีเฟรชหน้าซ้ำจะไม่มาบังหน้าจอซ้ำอีก
        // (เปิดแท็บใหม่/เซสชันใหม่ยังเห็นตามปกติ เพราะ sessionStorage ผูกกับแท็บนั้น ๆ)
        setPopups((data.popups || []).filter((p) => !seen.has(p.id)));
      })
      .catch(() => {});
  }, []);

  if (closed || popups.length === 0 || index >= popups.length) return null;
  const popup = popups[index];

  function next() {
    if (index + 1 < popups.length) setIndex((i) => i + 1);
    else {
      markSeen(popups.map((p) => p.id));
      setClosed(true);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm p-5 animate-popin">
        {popup.imageUrl && <img src={popup.imageUrl} alt="" className="rounded-xl w-full max-h-56 object-contain bg-slate-100 dark:bg-slate-800 mb-3" />}
        <p className="font-bold text-lg">{popup.title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line">{popup.body}</p>
        <button onClick={next} className="btn-primary w-full mt-4">
          {index + 1 < popups.length ? "ถัดไป" : "รับทราบ"}
        </button>
      </div>
    </div>
  );
}
