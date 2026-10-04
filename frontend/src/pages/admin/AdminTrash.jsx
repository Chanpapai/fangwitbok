import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export default function AdminTrash() {
  const { user } = useAuth();
  const [data, setData] = useState({ posts: [], comments: [] });

  function load() {
    api.get("/api/admin/trash").then(setData);
  }
  useEffect(load, []);

  async function restorePost(id) {
    await api.post(`/api/admin/trash/posts/${id}/restore`);
    load();
  }
  async function restoreComment(id) {
    await api.post(`/api/admin/trash/comments/${id}/restore`);
    load();
  }
  async function purgePost(id) {
    if (!confirm("ลบถาวรทันทีใช่ไหม? กู้คืนไม่ได้อีก")) return;
    await api.del(`/api/admin/trash/posts/${id}`);
    load();
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-bold mb-2">โพสต์ใน Trash ({data.posts.length})</p>
        <div className="flex flex-col gap-2">
          {data.posts.map((p) => (
            <div key={p.id} className="card p-3">
              <p className="text-sm line-clamp-2 break-words">{p.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                โดย {p.author.displayName} · เหลือ {p.daysUntilPurge} วันก่อนลบถาวรอัตโนมัติ
              </p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => restorePost(p.id)} className="btn-primary text-xs">↩️ กู้คืน</button>
                {user?.role === "SUPER_ADMIN" && (
                  <button onClick={() => purgePost(p.id)} className="btn-danger text-xs">ลบถาวรทันที</button>
                )}
              </div>
            </div>
          ))}
          {data.posts.length === 0 && <p className="text-sm text-slate-400">ไม่มีโพสต์ใน Trash</p>}
        </div>
      </div>

      <div>
        <p className="font-bold mb-2">คอมเมนต์ใน Trash ({data.comments.length})</p>
        <div className="flex flex-col gap-2">
          {data.comments.map((c) => (
            <div key={c.id} className="card p-3">
              <p className="text-sm line-clamp-2 break-words">{c.content}</p>
              <p className="text-xs text-slate-400 mt-1">
                โดย {c.author.displayName} · เหลือ {c.daysUntilPurge} วัน
              </p>
              <button onClick={() => restoreComment(c.id)} className="btn-primary text-xs mt-2">↩️ กู้คืน</button>
            </div>
          ))}
          {data.comments.length === 0 && <p className="text-sm text-slate-400">ไม่มีคอมเมนต์ใน Trash</p>}
        </div>
      </div>
    </div>
  );
}
