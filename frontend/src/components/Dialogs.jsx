import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

// Modal ยืนยัน + Toast แจ้งผล แบบออกแบบเอง ใช้แทน confirm()/alert()/prompt() ของเบราว์เซอร์/ระบบปฏิบัติการทั้งเว็บ
//   const { confirm, toast } = useDialogs();
//   if (await confirm({ title, message, confirmText, tone: "danger" })) {...}
//   const reason = await confirm({ ..., input: { label, maxLength } })   // ได้ข้อความ ("" ถ้าเว้นว่าง) หรือ null ถ้ายกเลิก
//   toast("ข้อความ", "error" | "success" | "info")
const Ctx = createContext(null);

const TONE = {
  danger: "bg-red-600 hover:bg-red-700 text-white",
  success: "bg-emerald-700 hover:bg-emerald-800 text-white",
  primary: "bg-brand-600 hover:bg-brand-700 text-white",
  neutral: "bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-white/10 dark:hover:bg-white/15 dark:text-slate-100",
};
const TOAST = { error: "bg-red-700", success: "bg-emerald-700", info: "bg-slate-800 dark:bg-slate-700" };
const BTN = "flex-1 rounded-[14px] px-4 py-3 text-[16px] font-semibold transition active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#1b2350]";

function ConfirmModal({ opts, onClose }) {
  const { title, message, confirmText = "ยืนยัน", cancelText = "ยกเลิก", tone = "primary", cancelTone = "neutral", icon, input } = opts;
  const [text, setText] = useState("");
  const box = useRef(null);
  const cancelRef = useRef(null);
  const okRef = useRef(null);
  const cancel = () => onClose(input ? null : false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") return cancel();
      if (e.key !== "Tab" || !box.current) return;
      // โฟกัสวนอยู่ในกล่องยืนยันเท่านั้น
      const f = [...box.current.querySelectorAll("button, textarea, input")].filter((x) => !x.disabled);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    // การลบ/ถอนสิทธิ์: โฟกัสที่ปุ่มยกเลิกก่อน กันกด Enter พลาด
    (input ? box.current?.querySelector("textarea") : tone === "danger" && cancelText ? cancelRef.current : okRef.current)?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-md flex items-center justify-center p-5 animate-scrim" onMouseDown={(e) => e.target === e.currentTarget && cancel()}>
      <div
        ref={box} role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" aria-describedby="dlg-msg"
        className="w-full max-w-sm rounded-[24px] bg-white text-slate-900 dark:bg-[#1b2350] dark:text-slate-50 border border-slate-200 dark:border-white/15 shadow-2xl p-5 animate-ios-pop"
      >
        {icon && (
          <span className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 ${tone === "danger" ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200" : "bg-brand-100 text-brand-700 dark:bg-brand-400/20 dark:text-brand-200"}`}>
            <Icon name={icon} size={22} />
          </span>
        )}
        <p id="dlg-title" className="font-bold text-lg leading-snug">{title}</p>
        {message && <p id="dlg-msg" className="mt-1.5 text-[15px] leading-relaxed whitespace-pre-line break-words text-slate-600 dark:text-slate-300">{message}</p>}
        {input && (
          <label className="block mt-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{input.label}</span>
            <textarea className="input mt-1" rows={2} maxLength={input.maxLength || 300} value={text} onChange={(e) => setText(e.target.value)} placeholder={input.placeholder} />
          </label>
        )}
        <div className="flex gap-2.5 mt-5">
          {cancelText && <button ref={cancelRef} type="button" onClick={cancel} className={`${BTN} ${TONE[cancelTone] || TONE.neutral}`}>{cancelText}</button>}
          <button ref={okRef} type="button" onClick={() => onClose(input ? text.trim() : true)} className={`${BTN} ${TONE[tone] || TONE.primary}`}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null); // { opts, resolve }
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setDlg((cur) => { cur?.resolve(cur.opts.input ? null : false); return { opts, resolve }; })),
    []
  );
  const toast = useCallback((message, type = "info") => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === "error" ? 5000 : 3000);
  }, []);
  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {dlg && <ConfirmModal opts={dlg.opts} onClose={(r) => { dlg.resolve(r); setDlg(null); }} />}
      <div className="fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => (
          <button
            key={t.id} type="button" role={t.type === "error" ? "alert" : "status"}
            onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))}
            className={`pointer-events-auto max-w-sm w-fit rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg text-left animate-popin ${TOAST[t.type] || TOAST.info}`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useDialogs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialogs ต้องใช้ภายใน DialogProvider");
  return ctx;
}
