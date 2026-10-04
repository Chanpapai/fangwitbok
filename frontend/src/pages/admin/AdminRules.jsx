import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export default function AdminRules() {
  const [blocks, setBlocks] = useState([]);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  function load() { api.get("/api/rules").then((d) => setBlocks(d.blocks)); }
  useEffect(load, []);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = new FormData();
      form.append("heading", heading);
      form.append("body", body);
      if (file) form.append("image", file);
      await api.postForm("/api/admin/rules", form);
      setHeading(""); setBody(""); setFile(null);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateOrder(b, order) {
    await api.patch(`/api/admin/rules/${b.id}`, { order });
    load();
  }
  async function remove(id) {
    if (!confirm("ลบรายการนี้ใช่ไหม?")) return;
    await api.del(`/api/admin/rules/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={add} className="card p-4 flex flex-col gap-2.5">
        <p className="font-bold">เพิ่มเนื้อหากฎใหม่</p>
        <input className="input" placeholder="หัวข้อ (ไม่บังคับ)" value={heading} onChange={(e) => setHeading(e.target.value)} />
        <textarea className="input" rows={3} placeholder="เนื้อหา" value={body} onChange={(e) => setBody(e.target.value)} />
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0])} className="text-xs" />
        <button disabled={busy} className="btn-primary">เพิ่ม</button>
      </form>

      {blocks.map((b, i) => (
        <div key={b.id} className="card p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <input type="number" className="input !w-16 !py-1" value={b.order} onChange={(e) => updateOrder(b, +e.target.value)} />
            <p className="font-semibold text-sm flex-1">{b.heading || "(ไม่มีหัวข้อ)"}</p>
            <button onClick={() => remove(b.id)} className="btn-danger !py-1 !px-2 text-xs">ลบ</button>
          </div>
          {b.imageUrl && <img src={b.imageUrl} className="rounded-lg max-h-32 object-contain mb-1.5" />}
          <p className="text-xs text-slate-500 line-clamp-2">{b.body}</p>
        </div>
      ))}
    </div>
  );
}
