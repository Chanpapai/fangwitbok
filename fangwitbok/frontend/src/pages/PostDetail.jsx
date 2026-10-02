import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(false);
  const [busy, setBusy] = useState(false);

  function load() {
    api
      .get(`/api/posts/${id}`)
      .then((data) => {
        setPost(data.post);
        setComments(data.comments);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const data = await api.post(`/api/posts/${id}/comments`, { content: text.trim(), isAnonymous: anon });
      setComments((prev) => [...prev, data.comment]);
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(commentId) {
    if (!confirm("ลบคอมเมนต์นี้ใช่ไหม?")) return;
    try {
      await api.del(`/api/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err.message);
    }
  }

  if (error) return <p className="max-w-xl mx-auto p-6 text-red-500 text-sm">{error}</p>;
  if (!post) return <p className="max-w-xl mx-auto p-6 text-slate-400 text-sm text-center">กำลังโหลด...</p>;

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 mb-3">← กลับ</button>

      <PostCard post={post} detailed onChanged={(updated) => (updated === null ? navigate("/") : setPost(updated))} />

      <div className="card p-4 mt-3">
        <p className="font-bold mb-3">💬 ความคิดเห็น ({comments.length})</p>

        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {c.author.displayName?.[0] || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                  <p className="text-xs font-semibold">{c.author.displayName}</p>
                  <p className="text-sm whitespace-pre-line break-words">{c.content}</p>
                </div>
                <div className="flex items-center gap-2 mt-0.5 ml-1">
                  <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                  {(c.isMine || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
                    <button onClick={() => removeComment(c.id)} className="text-[11px] text-red-500">ลบ</button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400 text-center">ยังไม่มีความคิดเห็น</p>}
        </div>

        {user ? (
          <form onSubmit={submitComment} className="mt-4 flex flex-col gap-2">
            <textarea className="input" rows={2} placeholder="แสดงความคิดเห็น..." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> ไม่ระบุชื่อ
              </label>
              <button disabled={busy} className="btn-primary">ส่งความคิดเห็น</button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-slate-400 mt-3 text-center">เข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
        )}
      </div>
    </div>
  );
}
