import { useEffect, useState } from "react";
import Icon from "./Icon";

// ตัวเลือกแชร์สำรอง เมื่อเบราว์เซอร์ไม่รองรับ Web Share API (เช่น คอมพิวเตอร์บางเครื่อง)
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* ลองวิธีสำรอง */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function ShareSheet({ url, text, onClose }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text || "FangwitBok");
  const targets = [
    { label: "LINE", icon: "chat", href: `https://social-plugins.line.me/lineit/share?url=${u}`, tone: "text-emerald-600" },
    { label: "Facebook", icon: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, tone: "text-blue-600" },
    { label: "X", icon: "send", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, tone: "text-slate-800" },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 flex items-end sm:items-center justify-center sm:p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="แชร์โพสต์">
      <div className="w-full sm:max-w-sm bg-white text-slate-900 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl animate-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-lg">แชร์โพสต์</p>
          <button onClick={onClose} aria-label="ปิด" className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"><Icon name="close" size={18} /></button>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {targets.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" onClick={onClose}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <Icon name={x.icon} size={22} className={x.tone} /> {x.label}
            </a>
          ))}
        </div>
        <button
          onClick={async () => { setCopied(await copyText(url)); }}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-3 text-sm font-semibold active:scale-[.99]"
        >
          <Icon name={copied ? "check" : "copy"} size={17} /> {copied ? "คัดลอกลิงก์แล้ว" : "คัดลอกลิงก์โพสต์"}
        </button>
      </div>
    </div>
  );
}
