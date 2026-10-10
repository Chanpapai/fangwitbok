import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Icon from "./Icon";

// ระบบ Dialog กลางของเว็บ (แทน confirm()/alert()/prompt() ของเบราว์เซอร์ทั้งหมด)
//   const { confirm, notify } = useDialog();
//   const ok = await confirm({ title, message, confirmText, tone: "danger" });          -> true / false
//   const reason = await confirm({ ..., input: { label, placeholder } });               -> string / false
//   notify("ข้อความ", "error" | "success");                                             -> แถบแจ้งเตือนสั้น ๆ ด้านล่าง
const DialogContext = createContext(null);

export function DialogProvider({ children }) {
  const [dlg, setDlg] = useState(null);
  const [toast, setToast] = useState(null);
  const [text, setText] = useState("");
  const confirmBtn = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => { setText(""); setDlg({ ...opts, resolve }); }), []);
  const notify = useCallback((message, tone = "error") => setToast({ message, tone, id: Date.now() }), []);

  const close = useCallback((result) => {
    setDlg((d) => { d?.resolve(result); return null; });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!dlg) return;
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dlg.input) confirmBtn.current?.focus();
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [dlg, close]);

  // toast(message, "error"|"success"|"info") = ชื่อเรียกอีกแบบของ notify (ใช้ในหน้าตั้งค่า/แชท) — "info" แสดงเป็นแถบเขียวเหมือน success
  const value = useMemo(() => ({ confirm, notify, toast: notify }), [confirm, notify]);
  const danger = dlg?.tone === "danger";

  return (
    <DialogContext.Provider value={value}>
      {children}

      {dlg && (
        <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5" onClick={() => close(false)} role="alertdialog" aria-modal="true" aria-label={dlg.title}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); close(dlg.input ? text.trim() : true); }}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1b2350] text-slate-900 dark:text-slate-50 border border-slate-200 dark:border-white/15 shadow-2xl p-5 animate-popin"
          >
            <p className="font-bold text-lg">{dlg.title}</p>
            {dlg.message && <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-200 mt-1.5 whitespace-pre-line break-words">{dlg.message}</p>}
            {dlg.input && (
              <div className="mt-3">
                {dlg.input.label && <label className="text-xs font-semibold text-slate-500 dark:text-slate-300">{dlg.input.label}</label>}
                <input autoFocus className="input mt-1" value={text} onChange={(e) => setText(e.target.value)} placeholder={dlg.input.placeholder || ""} maxLength={300} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button type="button" onClick={() => close(false)} className="btn-ghost !py-2.5">{dlg.cancelText || "ยกเลิก"}</button>
              <button
                ref={confirmBtn} type="submit"
                className={`btn !py-2.5 text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-gradient-to-r from-brand-400 to-brand-500"}`}
              >
                {dlg.confirmText || "ยืนยัน"}
              </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div key={toast.id} className="fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 pointer-events-none" role="status" aria-live="polite">
          <div className={`pointer-events-auto max-w-sm w-full flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-xl animate-popin ${toast.tone === "success" || toast.tone === "info" ? "bg-emerald-600" : "bg-red-600"}`}>
            <Icon name={toast.tone === "success" || toast.tone === "info" ? "check" : "flag"} size={18} className="mt-0.5" />
            <span className="flex-1 break-words">{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} aria-label="ปิด" className="opacity-80 hover:opacity-100"><Icon name="close" size={16} /></button>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog ต้องใช้ภายใน DialogProvider");
  return ctx;
}

export const useDialogs = useDialog; // ชื่อเดิมที่หน้าตั้งค่า/แชทใช้
