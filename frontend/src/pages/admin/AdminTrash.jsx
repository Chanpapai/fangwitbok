import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import { useDialogs } from "../../components/Dialogs";

export default function AdminTrash() {
  const { user } = useAuth();
  const { confirm } = useDialogs();
  const [data, setData] = useState({ posts: [], comments: [] });

  function load() { api.get("/api/admin/trash").then(setData); }
  useEffect(load, []);

  const restore = async (kind, id) => { await api.post(`/api/admin/trash/${kind}/${id}/restore`); load(); };
  async function purgePost(id) {
    const ok = await confirm({ title: "ลบถาวรทันที?", message: "กู้คืนไม่ได้อีก และรูปของโพสต์จะถูกลบออกจากที่เก็บด้วย", confirmText: "ลบถาวร", tone: "danger", icon: "trash" });
    if (!ok) return;
    await api.del(`/api/admin/trash/posts/${id}`);
    load();
  }

  const Item = ({ x, kind }) => (
    <div className="card p-3">
      <p className="text-sm line-clamp-2 break-words">{x.content}</p>
      <p className="text-xs text-slate-400 mt-1">โดย {x.authorLabel} · เหลือ {x.daysUntilPurge} วันก่อนลบถาวรอัตโนมัติ</p>
      <div className="flex gap-2 mt-2">
        <button onClick={() => restore(kind, x.id)} className="btn-primary text-xs"><Icon name="undo" size={14} /> กู้คืน</button>
        {kind === "posts" && user?.role === "SUPER_ADMIN" && <button onClick={() => purgePost(x.id)} className="btn-danger text-xs">ลบถาวรทันที</button>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-bold mb-2">โพสต์ใน Trash ({data.posts.length})</p>
        <div className="flex flex-col gap-2">
          {data.posts.map((p) => <Item key={p.id} x={p} kind="posts" />)}
          {data.posts.length === 0 && <p className="text-sm text-slate-400">ไม่มีโพสต์ใน Trash</p>}
        </div>
      </div>
      <div>
        <p className="font-bold mb-2">คอมเมนต์ใน Trash ({data.comments.length})</p>
        <div className="flex flex-col gap-2">
          {data.comments.map((c) => <Item key={c.id} x={c} kind="comments" />)}
          {data.comments.length === 0 && <p className="text-sm text-slate-400">ไม่มีคอมเมนต์ใน Trash</p>}
        </div>
      </div>
    </div>
  );
}
