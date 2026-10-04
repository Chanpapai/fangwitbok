import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { getOwnerToken, saveOwnerToken } from "../lib/identity";
import PostCard from "../components/PostCard";
import { TrashIcon } from "../components/Icons";

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
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [identify, setIdentify] = useState(true);
  const [guestName, setGuestName] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api.get(`/api/posts/${id}`).then((data) => { setPost(data.post); setComments(data.comments); }).catch((err) => setError(err.message));
  }
  useEffect(load, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    if (identify && !guestName.trim()) return alert("กรุณากรอกชื่อ หรือเลือกไม่ระบุตัวตน");
    setBusy(true);
    try {
      const data = await api.post(`/api/posts/${id}/comments`, { content: text.trim(), isAnonymous: !identify, guestName: identify ? guestName.trim() : "" });
      if (data.ownerToken) saveOwnerToken("comment", data.comment.id, data.ownerToken);
      setComments((prev) => [...prev, data.comment]);
      setText("");
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(c) {
    if (!confirm("ลบความคิดเห็นนี้ใช่ไหม?")) return;
    try {
      await api.del(`/api/comments/${c.id}`, { "x-owner-token": getOwnerToken("comment", c.id) || "" });
      setComments((prev) => prev.filter((x) => x.id !== c.id));
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
        <p className="font-bold mb-3">ความคิดเห็น ({comments.length})</p>
        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id}>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                <p className="text-xs font-semibold">{c.author}</p>
                <p className="text-sm whitespace-pre-line break-words">{c.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5 ml-1">
                <span className="text-[11px] text-slate-400">{timeAgo(c.createdAt)}</span>
                {c.canManage && <button onClick={() => removeComment(c)} className="text-red-500"><TrashIcon size={12} /></button>}
              </div>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-400 text-center">ยังไม่มีความคิดเห็น</p>}
        </div>

        <form onSubmit={submitComment} className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button type="button" onClick={() => setIdentify(true)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${identify ? "bg-brand-500 text-white border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>ระบุตัวตน</button>
            <button type="button" onClick={() => setIdentify(false)} className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${!identify ? "bg-brand-500 text-white border-transparent" : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>ไม่ระบุตัวตน</button>
          </div>
          {identify && <input className="input" placeholder="ชื่อของคุณ" value={guestName} onChange={(e) => setGuestName(e.target.value)} maxLength={50} />}
          <textarea className="input" rows={2} placeholder="แสดงความคิดเห็น..." value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          <button disabled={busy} className="btn-primary self-end">ส่งความคิดเห็น</button>
        </form>
      </div>
    </div>
  );
}
