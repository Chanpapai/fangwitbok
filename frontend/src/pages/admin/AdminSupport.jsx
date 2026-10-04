import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";

export default function AdminSupport() {
  const [status, setStatus] = useState("OPEN");
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);

  const loadList = useCallback(() => api.get(`/api/admin/support?status=${status}`).then((d) => setThreads(d.threads)).catch(() => {}), [status]);
  const loadThread = useCallback((id) => api.get(`/api/admin/support/${id}`).then(setDetail).catch(() => {}), []);

  useEffect(() => {
    loadList();
    const id = setInterval(() => !document.hidden && loadList(), 15000);
    return () => clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
    const id = setInterval(() => !document.hidden && loadThread(activeId), 8000);
    return () => clearInterval(id);
  }, [activeId, loadThread]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [detail?.messages?.length]);

  async function reply(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const d = await api.post(`/api/admin/support/${activeId}/reply`, { body: text.trim() });
      setDetail((cur) => ({ ...cur, messages: [...cur.messages, d.message] }));
      setText("");
      loadList();
    } catch (err) { alert(err.message); } finally { setBusy(false); }
  }

  async function setThreadStatus(next) {
    await api.patch(`/api/admin/support/${activeId}`, { status: next });
    setActiveId(null); setDetail(null); loadList();
  }

  if (activeId && detail) {
    return (
      <div className="card flex flex-col h-[70dvh] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 dark:border-white/10">
          <button onClick={() => { setActiveId(null); setDetail(null); loadList(); }} className="btn-ghost !p-2" aria-label="กลับ"><Icon name="left" size={16} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{detail.thread.contact || "ผู้เข้าชมไม่ระบุช่องทางติดต่อ"}</p>
            <p className="text-[11px] text-slate-400">{detail.thread.status === "OPEN" ? "กำลังดำเนินการ" : "ปิดแล้ว"}</p>
          </div>
          <button onClick={() => setThreadStatus(detail.thread.status === "OPEN" ? "CLOSED" : "OPEN")} className="btn-ghost !py-1.5 text-xs">
            <Icon name={detail.thread.status === "OPEN" ? "check" : "undo"} size={14} /> {detail.thread.status === "OPEN" ? "ปิดเรื่อง" : "เปิดใหม่"}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {detail.messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] ${m.sender === "ADMIN" ? "self-end" : "self-start"}`}>
              <div className={`px-3.5 py-2 rounded-2xl text-sm whitespace-pre-line break-words ${m.sender === "ADMIN" ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white rounded-br-md" : "bg-slate-100 dark:bg-white/[0.08] rounded-bl-md"}`}>{m.body}</div>
              <p className={`text-[10px] text-slate-400 mt-0.5 ${m.sender === "ADMIN" ? "text-right" : ""}`}>{m.sender === "ADMIN" ? `${m.adminName || "แอดมิน"} · ` : ""}{timeAgo(m.createdAt)}</p>
            </div>
          ))}
          <div ref={bottom} />
        </div>
        <form onSubmit={reply} className="p-3 border-t border-slate-200 dark:border-white/10 flex items-end gap-2">
          <textarea className="input !py-2 resize-none" rows={1} maxLength={1000} placeholder="ตอบกลับ..." value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(e); } }} />
          <button disabled={busy || !text.trim()} className="btn-primary !p-3" aria-label="ส่ง"><Icon name="send" size={18} /></button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {[["OPEN", "กำลังดำเนินการ"], ["CLOSED", "ปิดแล้ว"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className={`chip ${status === k ? "chip-on" : "chip-off"}`}>{l}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {threads.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)} className={`card p-3 text-left flex items-start gap-3 ${t.unreadForAdmin ? "!border-brand-400/60" : ""}`}>
            <Icon name="chat" size={18} className="mt-0.5 text-brand-500" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold truncate">{t.contact || "ผู้เข้าชม"}</span>
                {t.unreadForAdmin > 0 && <span className="badge bg-rose-500/15 text-rose-500">{t.unreadForAdmin} ใหม่</span>}
              </span>
              <span className="block text-xs text-slate-500 truncate mt-0.5">{t.lastMessage ? `${t.lastMessage.sender === "ADMIN" ? "ตอบแล้ว: " : ""}${t.lastMessage.body}` : ""}</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">{timeAgo(t.lastMessageAt)}</span>
            </span>
          </button>
        ))}
        {threads.length === 0 && <p className="text-sm text-slate-400 text-center py-8">ไม่มีข้อความในหมวดนี้</p>}
      </div>
    </div>
  );
}
