import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useDialog } from "../../components/DialogProvider";
import Icon from "../../components/Icon";

const ICON = { instagram: "instagram", facebook: "facebook", discord: "discord" };
const TONE = { instagram: "text-pink-500", facebook: "text-blue-500", discord: "text-indigo-400" };
const HINT = { instagram: "https://instagram.com/ชื่อบัญชี", facebook: "https://facebook.com/ชื่อเพจ", discord: "https://discord.gg/รหัสเชิญ" };

function Row({ ch, onSaved }) {
  const { notify } = useDialog();
  const [url, setUrl] = useState(ch.url);
  const [enabled, setEnabled] = useState(ch.enabled);
  const [busy, setBusy] = useState(false);
  const dirty = url.trim() !== ch.url || enabled !== ch.enabled;

  async function save() {
    setBusy(true);
    try {
      const d = await api.put(`/api/admin/contacts/${ch.key}`, { url: url.trim(), enabled });
      setUrl(d.channel.url); setEnabled(d.channel.enabled);
      onSaved(d.channel);
      notify(`บันทึก ${ch.label} แล้ว`, "success");
    } catch (err) { notify(err.message); } finally { setBusy(false); }
  }

  return (
    <section className="card-post p-4 pt-5 flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <Icon name={ICON[ch.key]} size={22} className={TONE[ch.key]} />
        <p className="font-bold flex-1">{ch.label}</p>
        <button
          type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((v) => !v)}
          className={`relative w-12 h-7 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} aria-label={`แสดง ${ch.label} บนหน้าแรก`}
        >
          <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : ""}`} />
        </button>
      </div>
      <input className="input" type="text" inputMode="url" placeholder={HINT[ch.key]} value={url} onChange={(e) => setUrl(e.target.value)} maxLength={200} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 dark:text-slate-300">{enabled ? "แสดงบนหน้าแรก" : "ซ่อนอยู่ (ผู้เข้าชมไม่เห็น)"}</span>
        <button onClick={save} disabled={busy || !dirty} className="btn-primary text-xs !px-4">{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
      </div>
    </section>
  );
}

// จัดการ "ช่องทางการติดต่อ" ที่แสดงท้ายหน้าแรก: เปิด/ปิดแต่ละรายการ + ตั้งลิงก์ปลายทาง (เก็บในฐานข้อมูล ไม่หายเมื่อ Deploy)
export default function AdminContacts() {
  const [channels, setChannels] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/api/admin/contacts").then((d) => setChannels(d.channels)).catch((e) => setError(e.message)); }, []);

  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!channels) return <div className="card-post p-4 skeleton h-40" />;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">ผู้เข้าชมจะเห็นปุ่ม “ช่องทางการติดต่อ” ที่หน้าแรก เฉพาะรายการที่เปิดไว้ และกดแล้วเปิดลิงก์ที่ตั้งไว้ที่นี่</p>
      {channels.map((ch) => (
        <Row key={ch.key} ch={ch} onSaved={(c) => setChannels((list) => list.map((x) => (x.key === c.key ? c : x)))} />
      ))}
    </div>
  );
}
