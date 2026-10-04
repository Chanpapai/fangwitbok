import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { getVisitorToken, saveVisitorToken } from "../lib/identity";
import { ChatHelpIcon, CloseIcon, SendIcon } from "./Icons";

export default function IssueReportWidget() {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { if (open) loadOrPrepare(); }, [open]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [ticket]);

  async function loadOrPrepare() {
    const token = getVisitorToken();
    if (!token) return setTicket({ messages: [] }); // ยังไม่เคยแจ้งปัญหา เริ่มสนทนาใหม่
    try {
      const data = await api.get("/api/support/tickets/me", { "x-visitor-token": token });
      setTicket(data.ticket);
    } catch {
      setTicket({ messages: [] });
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const token = getVisitorToken();
      if (!token || !ticket?.id) {
        const data = await api.post("/api/support/tickets", { content: text.trim() });
        saveVisitorToken(data.visitorToken);
        setTicket(data.ticket);
      } else {
        const data = await api.post("/api/support/tickets/me/messages", { content: text.trim() }, { "x-visitor-token": token });
        setTicket((t) => ({ ...t, messages: [...t.messages, data.message] }));
      }
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="แจ้งปัญหา"
        className="fixed bottom-20 left-4 z-40 w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 text-white shadow-lg flex items-center justify-center">
        <ChatHelpIcon size={22} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="card w-full sm:max-w-sm h-[75vh] sm:h-[32rem] rounded-b-none sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800">
              <p className="font-bold text-sm">แจ้งปัญหาถึงแอดมิน</p>
              <button onClick={() => setOpen(false)}><CloseIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {(ticket?.messages || []).map((m) => (
                <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${m.sender === "ADMIN" ? "bg-slate-100 dark:bg-slate-800 self-start" : "bg-brand-500 text-white self-end"}`}>
                  {m.content}
                </div>
              ))}
              {(!ticket || ticket.messages?.length === 0) && <p className="text-xs text-slate-400 text-center mt-4">พิมพ์ข้อความแจ้งปัญหาด้านล่างได้เลย แอดมินจะเข้ามาตอบกลับที่นี่</p>}
              <div ref={endRef} />
            </div>
            <form onSubmit={send} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input className="input flex-1" placeholder="พิมพ์ข้อความ..." value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
              <button disabled={busy} className="btn-primary !px-3"><SendIcon size={16} /></button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
