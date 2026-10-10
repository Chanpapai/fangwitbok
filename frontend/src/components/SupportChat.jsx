import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { getThreadToken, setThreadToken } from "../lib/guest";
import Icon from "./Icon";

const headersFor = (t) => ({ headers: { "x-thread-token": t } });

// ปุ่มติดต่อแอดมินมุมขวาล่าง (สไตล์ Call Center) กดแล้วเปิดแชทกับ Admin — ข้อความเก็บในฐานข้อมูลจริง
// ประหยัด Request: ตอนปิดแชทเช็คข้อความใหม่แค่ทุก 60 วินาที (เฉพาะเมื่อมีห้องแชทและแท็บเปิดอยู่), ตอนเปิดทุก 8 วินาที
export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(() => getThreadToken());
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [status, setStatus] = useState("OPEN");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef(null);
  const { pathname } = useLocation();

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get("/api/support/thread", headersFor(token));
      setMessages(data.messages);
      setStatus(data.status);
      setUnread(0);
    } catch (err) {
      if (err.status === 404) { setToken(null); setMessages([]); }
    }
  }, [token]);

  useEffect(() => {
    if (!open || !token) return;
    load();
    const id = setInterval(() => !document.hidden && load(), 8000);
    return () => clearInterval(id);
  }, [open, token, load]);

  useEffect(() => {
    if (open || !token) return;
    const check = () =>
      !document.hidden && api.get("/api/support/unread", headersFor(token)).then((d) => setUnread(d.unread)).catch(() => {});
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [open, token]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [messages, open]);

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    setError("");
    try {
      if (!token) {
        const data = await api.post("/api/support/threads", { body });
        setThreadToken(data.threadToken);
        setToken(data.threadToken);
        setMessages(data.messages);
      } else {
        const data = await api.post("/api/support/messages", { body }, headersFor(token));
        setMessages((m) => [...m, data.message]);
        setStatus("OPEN");
      }
      setText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ปุ่มติดต่อแอดมิน: มุมขวาล่าง สไตล์ Call Center (หูฟัง + ข้อความ) เข้าใจง่ายกว่าวงกลมไอคอนล้วน */}
      <button
        onClick={() => setOpen(true)} aria-label="ติดต่อแอดมิน"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + ${pathname === "/" ? 100 : 72}px)` }}
        className="fixed right-3 z-40 h-12 pl-1.5 pr-4 rounded-full bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-lg shadow-brand-500/40 ring-2 ring-white/70 dark:ring-white/20 flex items-center gap-2 active:scale-95 transition"
      >
        <span className="relative w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
          <Icon name="headset" size={22} strokeWidth={2.1} />
          {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">{unread}</span>}
        </span>
        <span className="text-sm font-semibold leading-none">ติดต่อแอดมิน</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-end sm:justify-end sm:p-4" onClick={() => setOpen(false)}>
          <div className="card !bg-white dark:!bg-ink-800 w-full sm:w-96 h-[78dvh] sm:h-[34rem] flex flex-col overflow-hidden animate-sheet rounded-b-none sm:rounded-b-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-white/10">
              <div>
                <p className="font-bold text-sm flex items-center gap-2"><Icon name="headset" size={18} className="text-brand-500" /> แจ้งปัญหา / ติดต่อแอดมิน</p>
                <p className="text-[11px] text-slate-400">ไม่ต้องเข้าสู่ระบบ · ข้อความถึงทีมแอดมินโดยตรง</p>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost !p-2" aria-label="ปิด"><Icon name="close" size={18} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
              {messages.length === 0 && (
                <p className="text-sm text-slate-400 text-center mt-6">พบปัญหาการใช้งาน หรืออยากแจ้งเรื่องอะไร พิมพ์ถึงแอดมินได้เลย</p>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`max-w-[82%] ${m.sender === "VISITOR" ? "self-end" : "self-start"}`}>
                  {m.sender === "ADMIN" && <p className="text-[11px] text-slate-400 mb-0.5 ml-1">แอดมิน{m.adminName ? ` · ${m.adminName}` : ""}</p>}
                  <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-line break-words ${m.sender === "VISITOR" ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white rounded-br-md" : "bg-slate-100 dark:bg-white/[0.08] rounded-bl-md"}`}>{m.body}</div>
                </div>
              ))}
              {token && status === "CLOSED" && <p className="text-[11px] text-slate-400 text-center">แอดมินปิดเรื่องนี้แล้ว ส่งข้อความใหม่เพื่อเปิดอีกครั้ง</p>}
              <div ref={bottom} />
            </div>

            <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea className="input !py-2 resize-none" rows={1} maxLength={1000} placeholder="พิมพ์ข้อความ..." value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(e); } }} />
                <button disabled={busy || !text.trim()} className="btn-primary !p-3" aria-label="ส่ง"><Icon name="send" size={18} /></button>
              </div>
              {!token && <p className="text-[11px] text-slate-400">เมื่อส่งแล้ว เครื่องนี้จะจำห้องแชทไว้ เพื่อดูคำตอบจากแอดมินได้ภายหลัง</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
