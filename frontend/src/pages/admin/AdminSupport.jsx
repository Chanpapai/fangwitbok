import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminSupport() {
  const [status, setStatus] = useState("OPEN");
  const [tickets, setTickets] = useState([]);
  const [active, setActive] = useState(null);
  const [reply, setReply] = useState("");

  function load() { api.get(`/api/admin/support/tickets?status=${status}`).then((d) => setTickets(d.tickets)); }
  useEffect(load, [status]);

  async function open(id) {
    const d = await api.get(`/api/admin/support/tickets/${id}`);
    setActive(d.ticket);
  }
  async function send(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    await api.post(`/api/admin/support/tickets/${active.id}/reply`, { content: reply.trim() });
    setReply("");
    open(active.id);
  }
  async function close() {
    await api.post(`/api/admin/support/tickets/${active.id}/close`);
    setActive(null);
    load();
  }

  if (active) {
    return (
      <div className="card p-4 flex flex-col gap-3">
        <button onClick={() => setActive(null)} className="text-sm text-slate-500 self-start">← กลับ</button>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {active.messages.map((m) => (
            <div key={m.id} className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${m.sender === "ADMIN" ? "bg-brand-500 text-white self-end" : "bg-slate-100 dark:bg-slate-800 self-start"}`}>{m.content}</div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <input className="input flex-1" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="ตอบกลับ..." />
          <button className="btn-primary">ส่ง</button>
        </form>
        <button onClick={close} className="btn-ghost text-xs">ปิดการสนทนานี้</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {["OPEN", "CLOSED"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status === s ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800"}`}>{s === "OPEN" ? "เปิดอยู่" : "ปิดแล้ว"}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {tickets.map((t) => (
          <button key={t.id} onClick={() => open(t.id)} className="card p-3 text-left">
            <p className="text-sm line-clamp-2">{t.messages[0]?.content}</p>
            <p className="text-[11px] text-slate-400 mt-1">{new Date(t.updatedAt).toLocaleString("th-TH")}</p>
          </button>
        ))}
        {tickets.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ไม่มีรายการ</p>}
      </div>
    </div>
  );
}
