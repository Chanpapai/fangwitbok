import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import Icon from "../../components/Icon";
import ImageUploader from "./ImageUploader";
import { useDialogs } from "../../components/Dialogs";

export default function AdminRules() {
  const { confirm } = useDialogs();
  const [blocks, setBlocks] = useState([]);
  const [newText, setNewText] = useState("");
  const [editing, setEditing] = useState({}); // id -> ข้อความที่กำลังแก้
  const [error, setError] = useState("");

  function load() { api.get("/api/rules").then((d) => setBlocks(d.blocks)); }
  useEffect(load, []);

  const run = async (fn) => { setError(""); try { await fn(); load(); } catch (err) { setError(err.message); } };

  const addText = () => run(async () => {
    await api.post("/api/admin/rules", { type: "TEXT", text: newText });
    setNewText("");
  });
  const addImage = ({ path }) => path && run(() => api.post("/api/admin/rules", { type: "IMAGE", imageUrl: path }));
  const saveText = (b) => run(async () => {
    await api.patch(`/api/admin/rules/${b.id}`, { text: editing[b.id] });
    setEditing((e) => { const n = { ...e }; delete n[b.id]; return n; });
  });
  const replaceImage = (b, { path }) => path && run(() => api.patch(`/api/admin/rules/${b.id}`, { imageUrl: path }));
  const remove = async (b) => {
    const ok = await confirm({ title: "ลบเนื้อหากฎนี้?", message: b.type === "TEXT" ? (b.text || "").slice(0, 80) : "รูปภาพนี้จะถูกลบออกจากหน้ากฎ", confirmText: "ลบ", tone: "danger", icon: "trash" });
    if (ok) run(() => api.del(`/api/admin/rules/${b.id}`));
  };
  const move = (i, d) => {
    const ids = blocks.map((b) => b.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    setBlocks(ids.map((id) => blocks.find((b) => b.id === id))); // อัปเดตหน้าจอทันที แล้วบันทึกลำดับ
    run(() => api.post("/api/admin/rules/reorder", { ids }));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-4 flex flex-col gap-2.5">
        <p className="font-bold flex items-center gap-2"><Icon name="plus" size={17} /> เพิ่มเนื้อหากฎ</p>
        <textarea className="input" rows={3} maxLength={3000} placeholder="พิมพ์ข้อความกฎ..." value={newText} onChange={(e) => setNewText(e.target.value)} />
        <div className="flex flex-wrap gap-2 items-start">
          <button disabled={!newText.trim()} onClick={addText} className="btn-primary text-sm"><Icon name="text" size={16} /> เพิ่มข้อความ</button>
          <ImageUploader folder="rules" onChange={addImage} label="เพิ่มรูปภาพ" />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {blocks.map((b, i) => (
          <div key={b.id} className="card p-3 flex gap-3">
            <div className="flex flex-col gap-1">
              <button disabled={i === 0} onClick={() => move(i, -1)} className="btn-ghost !p-1.5" aria-label="เลื่อนขึ้น"><Icon name="up" size={15} /></button>
              <button disabled={i === blocks.length - 1} onClick={() => move(i, 1)} className="btn-ghost !p-1.5" aria-label="เลื่อนลง"><Icon name="down" size={15} /></button>
            </div>
            <div className="flex-1 min-w-0">
              {b.type === "TEXT" ? (
                editing[b.id] !== undefined ? (
                  <div className="flex flex-col gap-2">
                    <textarea className="input" rows={4} maxLength={3000} value={editing[b.id]} onChange={(e) => setEditing({ ...editing, [b.id]: e.target.value })} />
                    <div className="flex gap-2">
                      <button onClick={() => saveText(b)} className="btn-primary text-xs">บันทึก</button>
                      <button onClick={() => setEditing((e) => { const n = { ...e }; delete n[b.id]; return n; })} className="btn-ghost text-xs">ยกเลิก</button>
                    </div>
                  </div>
                ) : <p className="text-sm whitespace-pre-line break-words">{b.text}</p>
              ) : (
                <ImageUploader folder="rules" value={b.imagePath} previewUrl={b.imageUrl} onChange={(r) => (r.path ? replaceImage(b, r) : null)} label="เปลี่ยนรูป" />
              )}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              {b.type === "TEXT" && editing[b.id] === undefined && (
                <button onClick={() => setEditing({ ...editing, [b.id]: b.text || "" })} className="btn-ghost !p-2" aria-label="แก้ไข"><Icon name="edit" size={15} /></button>
              )}
              <button onClick={() => remove(b)} className="btn-danger !p-2" aria-label="ลบ"><Icon name="trash" size={15} /></button>
            </div>
          </div>
        ))}
        {blocks.length === 0 && <p className="text-sm text-slate-400 text-center py-4">ยังไม่มีเนื้อหากฎ</p>}
      </div>
    </div>
  );
}
