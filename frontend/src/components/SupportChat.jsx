import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { getThreadToken, setThreadToken } from "../lib/guest";
import { useVisualViewport } from "../lib/viewport";
import { useUnreadJump } from "../lib/useUnreadJump";
import Icon from "./Icon";
import EmojiPicker, { EmojiToggle, insertEmoji } from "./EmojiPicker";
import UnreadBell from "./UnreadBell";
import { useSite } from "../context/SiteContext";

const headersFor = (t) => ({ headers: { "x-thread-token": t } });

// ปุ่มติดต่อแอดมินมุมขวาล่าง + แชทสไตล์ iOS Messages — ข้อความเก็บในฐานข้อมูลจริง
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
  const [emoji, setEmoji] = useState(false);
  const list = useRef(null);
  const bottom = useRef(null);
  const input = useRef(null);
  const { pathname } = useLocation();
  const { site } = useSite();
  const vp = useVisualViewport(open);
  const homeOffset = site.contacts?.length ? 152 : 100; // หน้าแรกมีปุ่ม "ช่องทางการติดต่อ" เพิ่มอีกแถว

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.get("/api/support/thread", headersFor(token));
      setMessages(data.messages);
      setStatus(data.status);
      setUnread(data.unread);
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
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [open, token]);

  // ล็อกการเลื่อนของหน้าด้านหลัง + ปิดด้วย Esc ขณะเปิดแชท
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const k = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", k); };
  }, [open]);

  // เลื่อนลงล่างสุดเมื่อมีข้อความของเราเอง/เปิดแชท/คีย์บอร์ดเปิด (ไม่ดึงผู้ใช้ที่กำลังอ่านย้อนหลังลงล่างทุกครั้งที่ poll)
  const lastCount = useRef(0);
  useEffect(() => {
    if (!open) { lastCount.current = 0; return; }
    const el = list.current;
    const first = lastCount.current === 0;
    const mineLast = messages[messages.length - 1]?.sender === "VISITOR";
    const nearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 120 : true;
    if (messages.length !== lastCount.current && (first || mineLast || nearBottom)) bottom.current?.scrollIntoView({ block: "end" });
    lastCount.current = messages.length;
  }, [messages, open, vp.keyboardOpen]);

  const markRead = useCallback(async (ids) => {
    const d = await api.post("/api/support/read", { ids }, headersFor(token));
    setUnread(d.unread);
  }, [token]);
  const bell = useUnreadJump({ containerRef: list, messages, onMarkRead: markRead, active: open && Boolean(token) });

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
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
      setEmoji(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* ปุ่มติดต่อแอดมิน: มุมขวาล่าง เหนือแถบนำทาง/Safe Area เสมอ */}
      <button
        onClick={() => setOpen(true)} aria-label="ติดต่อแอดมิน"
        style={{ bottom: `calc(env(safe-area-inset-bottom) + ${pathname === "/" ? homeOffset : 72}px)`, right: "max(0.75rem, env(safe-area-inset-right))" }}
        className="fixed z-40 h-12 pl-1.5 pr-4 rounded-full bg-brand-600 text-white shadow-lg shadow-black/25 ring-2 ring-white/70 dark:ring-white/20 flex items-center gap-2 active:scale-95 transition"
      >
        <span className="relative w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
          <Icon name="headset" size={22} strokeWidth={2.1} />
          {unread > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white">{unread}</span>}
        </span>
        <span className="text-[15px] font-semibold leading-none">ติดต่อแอดมิน</span>
      </button>

      {open && (
        // ความสูง/ตำแหน่งตาม "พื้นที่ที่มองเห็นจริง" จึงไม่ถูกคีย์บอร์ดเสมือนบังช่องพิมพ์และปุ่มส่ง
        <div className="fixed inset-x-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:justify-end sm:p-4 animate-scrim"
          style={{ top: vp.top, height: vp.height }} onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="ติดต่อแอดมิน"
            className="bg-white dark:bg-ink-800 text-slate-900 dark:text-slate-50 w-full sm:w-96 h-[78dvh] max-h-full sm:h-[34rem] flex flex-col overflow-hidden animate-sheet rounded-t-[22px] sm:rounded-[22px] shadow-2xl"
            style={{ paddingTop: vp.keyboardOpen ? 0 : undefined }} onClick={(e) => e.stopPropagation()}>
            <div className="relative flex items-center justify-center px-4 py-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04]">
              <div className="text-center min-w-0 px-12">
                <p className="font-semibold text-[16px] leading-tight">แอดมิน FangwitBok</p>
                <p className="text-[12px] text-slate-600 dark:text-slate-300 truncate">ไม่ต้องเข้าสู่ระบบ · ถึงทีมแอดมินโดยตรง</p>
              </div>
              <button onClick={() => setOpen(false)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-brand-700 dark:text-brand-300 hover:bg-slate-200/70 dark:hover:bg-white/10" aria-label="ปิดแชท"><Icon name="close" size={20} /></button>
            </div>

            <div className="relative flex-1 min-h-0">
              <div ref={list} className="absolute inset-0 overflow-y-auto overscroll-contain px-3.5 py-3 flex flex-col gap-1.5">
                {messages.length === 0 && (
                  <p className="text-[15px] text-slate-600 dark:text-slate-300 text-center mt-6">พบปัญหาการใช้งาน หรืออยากแจ้งเรื่องอะไร พิมพ์ถึงแอดมินได้เลย</p>
                )}
                {messages.map((m) => {
                  const mine = m.sender === "VISITOR";
                  return (
                    <div key={m.id} data-mid={m.id} className={`max-w-[82%] ${mine ? "self-end" : "self-start"}`}>
                      {!mine && <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300 mb-0.5 ml-2">แอดมิน{m.adminName ? ` · ${m.adminName}` : ""}</p>}
                      <div className={`px-3.5 py-2 rounded-[20px] text-[16px] leading-[1.45] font-medium whitespace-pre-line break-words ${mine ? "bg-brand-600 text-white rounded-br-[6px]" : "bg-slate-200 text-slate-900 dark:bg-white/[0.18] dark:text-white rounded-bl-[6px]"}`}>{m.body}</div>
                    </div>
                  );
                })}
                {token && status === "CLOSED" && <p className="text-[12px] text-slate-600 dark:text-slate-300 text-center">แอดมินปิดเรื่องนี้แล้ว ส่งข้อความใหม่เพื่อเปิดอีกครั้ง</p>}
                <div ref={bottom} />
              </div>
              <UnreadBell show={bell.showBell} count={bell.count} onClick={bell.jump} />
            </div>

            <form onSubmit={send} className={`px-3 pt-2.5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2 ${vp.keyboardOpen ? "pb-2" : "pb-[max(0.75rem,env(safe-area-inset-bottom))]"}`}>
              {error && <p className="text-[13px] text-red-700 dark:text-red-300">{error}</p>}
              {emoji && <EmojiPicker onPick={(em) => insertEmoji(input.current, text, em, setText)} />}
              <div className="flex items-end gap-2">
                <EmojiToggle open={emoji} onClick={() => setEmoji((v) => !v)} />
                <textarea ref={input} className="input !py-2.5 resize-none max-h-28" rows={1} maxLength={1000} placeholder="ข้อความ" aria-label="พิมพ์ข้อความ" value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(e); } }} />
                <button disabled={busy || !text.trim()} className="shrink-0 w-11 h-11 rounded-full bg-brand-600 text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition" aria-label="ส่ง"><Icon name="send" size={19} /></button>
              </div>
              {!token && <p className="text-[12px] text-slate-600 dark:text-slate-300">เมื่อส่งแล้ว เครื่องนี้จะจำห้องแชทไว้ เพื่อดูคำตอบจากแอดมินได้ภายหลัง</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
