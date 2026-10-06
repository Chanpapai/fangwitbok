import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { parseSocialUrl, SOCIAL_LABEL } from "../../lib/social";
import BrandIcon from "../../components/BrandIcon";
import { useDialogs } from "../../components/Dialogs";
import { useSite } from "../../context/SiteContext";

const ORDER = ["INSTAGRAM", "FACEBOOK", "DISCORD"];
const HINT = { INSTAGRAM: "https://instagram.com/ชื่อบัญชี", FACEBOOK: "https://facebook.com/ชื่อเพจ", DISCORD: "https://discord.gg/รหัสเชิญ" };

// ช่องทางการติดต่อ (Instagram/Facebook/Discord) — เปิด/ปิดแสดงผลและใส่ลิงก์เองได้ เก็บในฐานข้อมูล (ไม่หายเมื่อ Deploy)
export default function AdminContacts() {
  const { toast } = useDialogs();
  const { refresh } = useSite();
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/api/admin/contacts")
      .then((d) => setRows(ORDER.map((p) => d.contacts.find((c) => c.platform === p) || { platform: p, url: "", active: false })))
      .catch((e) => setError(e.message));
  }, []);

  const set = (platform, patch) => setRows((rs) => rs.map((r) => (r.platform === platform ? { ...r, ...patch } : r)));

  async function save(e) {
    e.preventDefault();
    setError("");
    for (const r of rows) {
      const c = parseSocialUrl(r.url, [r.platform]);
      if (c.error) return setError(`${SOCIAL_LABEL[r.platform]}: ${c.error}`);
      if (c.empty && r.active) return setError(`กรุณาใส่ลิงก์ ${SOCIAL_LABEL[r.platform]} ก่อนเปิดการแสดงผล`);
    }
    setBusy(true);
    try {
      const d = await api.put("/api/admin/contacts", { contacts: rows });
      setRows(ORDER.map((p) => d.contacts.find((c) => c.platform === p)));
      await refresh(true);
      toast("บันทึกช่องทางการติดต่อแล้ว", "success");
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  if (!rows) return <div className="card-post p-4 skeleton h-48">{error && <p className="text-sm text-red-600">{error}</p>}</div>;

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <p className="text-sm text-slate-600 dark:text-slate-300">แสดงเป็นปุ่ม “ช่องทางการติดต่อ” ที่ด้านล่างหน้าแรก รายการที่ปิดอยู่จะไม่แสดง ลิงก์ต้องเป็นของแพลตฟอร์มนั้นเท่านั้น (https)</p>
      {rows.map((r) => {
        const check = parseSocialUrl(r.url, [r.platform]);
        const bad = r.url.trim() && check.error;
        const id = `c-${r.platform}`;
        return (
          <section key={r.platform} className="card-post p-4 pt-5 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
              <BrandIcon platform={r.platform} size={32} />
              <label htmlFor={id} className="font-bold flex-1">{SOCIAL_LABEL[r.platform]}</label>
              <button
                type="button" role="switch" aria-checked={r.active} aria-label={`แสดง ${SOCIAL_LABEL[r.platform]} บนหน้าแรก`}
                onClick={() => set(r.platform, { active: !r.active })}
                className={`relative w-14 h-8 rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${r.active ? "bg-emerald-600" : "bg-slate-400"}`}
              >
                <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${r.active ? "left-7" : "left-1"}`} />
              </button>
            </div>
            <input id={id} className="input" inputMode="url" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={300} placeholder={HINT[r.platform]} value={r.url} onChange={(e) => set(r.platform, { url: e.target.value })} />
            {bad && <p className="text-xs text-red-600">{check.error}</p>}
            <p className="text-xs text-slate-600">{r.active ? "กำลังแสดงบนหน้าแรก" : "ปิดอยู่ — ไม่แสดงบนหน้าแรก"}</p>
          </section>
        );
      })}
      {error && <p className="text-sm text-red-600 dark:text-red-300">{error}</p>}
      <button disabled={busy} className="btn-primary w-full py-3 text-base sticky bottom-3">{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
    </form>
  );
}
