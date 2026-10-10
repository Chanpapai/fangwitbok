import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getOwnerToken, setOwnerToken, dropOwnerToken, getSavedProfile, saveProfile } from "../lib/guest";
import PostCard, { AuthorLine } from "../components/PostCard";
import Icon from "../components/Icon";
import { useDialogs } from "../components/Dialogs";
import EmojiPicker, { EmojiToggle, insertEmoji } from "../components/EmojiPicker";

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isStaff } = useAuth();
  const { confirm, toast } = useDialogs();
  const [emoji, setEmoji] = useState(false);
  const commentBox = useRef(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = getSavedProfile();
    if (p.name) { setName(p.name); setClassName(p.className || ""); setAnon(false); }
  }, []);

  useEffect(() => {
    setPost(null); setError("");
    api.get(`/api/posts/${id}`)
      .then((d) => { setPost(d.post); setComments(d.comments); })
      .catch((e) => setError(e.message));
  }, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!anon && !name.trim()) return toast("กรุณากรอกชื่อ หรือเลือกไม่ระบุตัวตน", "error");
    setBusy(true);
    try {
      const data = await api.post(`/api/posts/${id}/comments`, {
        content: text.trim(), isAnonymous: anon, authorName: anon ? "" : name.trim(), authorClass: anon ? "" : className.trim(),
      });
      setOwnerToken("comment", data.comment.id, data.ownerToken);
      if (!anon) saveProfile(name.trim(), className.trim());
      setComments((prev) => [...prev, data.comment]);
      setPost((p) => ({ ...p, commentCount: p.commentCount + 1 }));
      setText("");
      setEmoji(false);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeComment(commentId) {
    const ok = await confirm({ title: "ลบความคิดเห็นนี้?", message: "ความคิดเห็นจะถูกลบออกจากโพสต์", confirmText: "ลบความคิดเห็น", tone: "danger", icon: "trash" });
    if (!ok) return;
    const token = getOwnerToken("comment", commentId);
    try {
      await api.del(`/api/comments/${commentId}`, { headers: token ? { "x-owner-token": token } : {} });
      dropOwnerToken("comment", commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  if (error) return (
    <div className="relative z-10 max-w-xl mx-auto p-6 text-center">
      <p className="text-red-500 text-sm">{error}</p>
      <button onClick={() => navigate("/feed")} className="btn-ghost mt-4">กลับไปหน้าโพสต์</button>
    </div>
  );
  if (!post) return <div className="relative z-10 max-w-xl mx-auto px-4 py-4"><div className="card p-4 skeleton h-48" /></div>;

  return (
    <div className="relative z-10 max-w-xl mx-auto px-4 py-4 pb-28">
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/feed"))} className="text-sm text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1">
        <Icon name="left" size={16} /> กลับ
      </button>

      <PostCard post={post} detailed onChanged={(_id, u) => (u === null ? navigate("/feed", { replace: true }) : setPost(u))} />

      <div className="card-post p-4 pt-5 mt-3">
        <p className="font-bold mb-3 flex items-center gap-2"><Icon name="chat" size={18} /> ความคิดเห็น ({comments.length})</p>

        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="bg-slate-100 rounded-[18px] px-3.5 py-2.5">
              <div className="flex items-start gap-2">
                <AuthorLine author={c.author} createdAt={c.createdAt} />
                {(getOwnerToken("comment", c.id) || isStaff) && (
                  <button onClick={() => removeComment(c.id)} className="text-slate-600 dark:text-slate-300 hover:text-red-600 p-1" aria-label="ลบคอมเมนต์"><Icon name="trash" size={15} /></button>
                )}
              </div>
              <p className="text-[16px] leading-[1.6] font-medium text-slate-950 whitespace-pre-line break-words mt-1">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300 text-center py-2">ยังไม่มีความคิดเห็น</p>}
        </div>

        <form onSubmit={submitComment} className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            {[[false, "user", "ระบุตัวตน"], [true, "eyeoff", "ไม่ระบุตัวตน"]].map(([v, icon, label]) => (
              <button key={label} type="button" onClick={() => setAnon(v)} className={`chip !py-1 text-xs flex items-center gap-1.5 ${anon === v ? "chip-on" : "chip-off"}`}>
                <Icon name={icon} size={13} /> {label}
              </button>
            ))}
          </div>
          {!anon && (
            <div className="grid grid-cols-5 gap-2">
              <input className="input col-span-3" placeholder="ชื่อ" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <input className="input col-span-2" placeholder="ชั้น/ห้อง" value={className} onChange={(e) => setClassName(e.target.value)} maxLength={30} />
            </div>
          )}
          {emoji && <EmojiPicker onPick={(em) => insertEmoji(commentBox.current, text, em, setText)} />}
          <div className="flex items-end gap-2">
            <EmojiToggle open={emoji} onClick={() => setEmoji((v) => !v)} />
            <textarea ref={commentBox} className="input resize-none" rows={2} placeholder="แสดงความคิดเห็น..." aria-label="แสดงความคิดเห็น" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
            <button disabled={busy || !text.trim()} className="btn-primary !p-3" aria-label="ส่งความคิดเห็น"><Icon name="send" size={18} /></button>
          </div>
        </form>
      </div>
    </div>
  );
}
