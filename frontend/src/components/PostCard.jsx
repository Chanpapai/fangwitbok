import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { getOwnerToken, dropOwnerToken } from "../lib/guest";
import { timeAgo } from "../lib/format";
import Icon from "./Icon";
import ImageLightbox from "./ImageLightbox";
import ReportModal from "./ReportModal";

export function AuthorLine({ author, createdAt }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-sm truncate flex items-center gap-1.5">
        {author.anonymous && <Icon name="eyeoff" size={14} className="text-slate-400" />}
        <span className={author.anonymous ? "text-slate-500 dark:text-slate-400" : ""}>{author.name}</span>
        {author.className && <span className="font-normal text-slate-400">· {author.className}</span>}
      </p>
      <p className="text-xs text-slate-400">{timeAgo(createdAt)}</p>
    </div>
  );
}

export default function PostCard({ post, onChanged, detailed = false }) {
  const { isStaff } = useAuth();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [lightbox, setLightbox] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [busy, setBusy] = useState(false);

  const ownerToken = getOwnerToken("post", post.id);
  const isOwner = !!ownerToken;
  const found = post.lostStatus === "FOUND";

  async function toggleLike() {
    const was = liked;
    setLiked(!was);
    setLikeCount((c) => c + (was ? -1 : 1));
    try {
      const data = await api.post(`/api/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked(was);
      setLikeCount((c) => c + (was ? 1 : -1));
    }
  }

  async function setStatus(status) {
    if (status === post.lostStatus) return;
    setBusy(true);
    try {
      const data = await api.patch(`/api/posts/${post.id}/lost-status`, { status }, { headers: { "x-owner-token": ownerToken } });
      onChanged?.({ ...post, lostStatus: data.lostStatus });
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deletePost() {
    if (!confirm("ลบโพสต์นี้ใช่ไหม?")) return;
    setBusy(true);
    try {
      await api.del(`/api/posts/${post.id}`, { headers: ownerToken ? { "x-owner-token": ownerToken } : {} });
      dropOwnerToken("post", post.id);
      onChanged?.(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) navigator.share({ title: "FangwitBok", url }).catch(() => {});
    else { await navigator.clipboard?.writeText(url); alert("คัดลอกลิงก์โพสต์แล้ว"); }
  }

  const imgs = post.images || [];
  const single = imgs.length === 1;

  return (
    <article className="card p-4">
      <div className="flex items-center gap-2">
        <AuthorLine author={post.author} createdAt={post.createdAt} />
        <span className={`badge ${post.type === "LOST_FOUND" ? "bg-amber-500/15 text-amber-600 dark:text-amber-300" : "bg-brand-500/15 text-brand-600 dark:text-brand-300"}`}>
          <Icon name={post.type === "LOST_FOUND" ? "search" : "megaphone"} size={12} />
          {post.type === "LOST_FOUND" ? "ตามหาของหาย" : "ฝากบอก"}
        </span>
      </div>

      {post.type === "LOST_FOUND" && (
        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
          <span className={`badge ${found ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-red-500/15 text-red-600 dark:text-red-300"}`}>
            <Icon name={found ? "check" : "search"} size={12} /> {found ? "เจอของแล้ว" : "ยังไม่เจอ"}
          </span>
          {post.location && <span className="text-xs text-slate-500 flex items-center gap-1"><Icon name="pin" size={13} /> {post.location}</span>}
        </div>
      )}

      {post.type === "LOST_FOUND" && isOwner && (
        <div className="mt-2.5 inline-flex rounded-full bg-slate-100 dark:bg-white/[0.07] p-0.5 text-xs font-semibold">
          {[["NOT_FOUND", "ยังไม่เจอ"], ["FOUND", "เจอของแล้ว"]].map(([v, label]) => (
            <button
              key={v} disabled={busy} onClick={() => setStatus(v)}
              className={`px-3 py-1.5 rounded-full transition ${post.lostStatus === v ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow" : "text-slate-500"}`}
            >{label}</button>
          ))}
        </div>
      )}

      <Link to={`/post/${post.id}`} className="block mt-2.5">
        <p className={`text-[15px] leading-relaxed whitespace-pre-line break-words ${detailed ? "" : "line-clamp-6"}`}>{post.content}</p>
      </Link>

      {imgs.length > 0 && (
        <div className={`mt-3 grid gap-1.5 ${single ? "grid-cols-1" : "grid-cols-2"}`}>
          {imgs.map((im, i) => (
            <button
              key={im.url} onClick={() => setLightbox(i)} aria-label="ดูรูปเต็มจอ"
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-ink-900 block"
            >
              <img
                src={im.url} alt="" loading="lazy" decoding="async"
                width={im.width || undefined} height={im.height || undefined}
                className={single ? "w-full max-h-[28rem] object-contain" : "w-full aspect-square object-cover"}
              />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 text-sm text-slate-500">
        <button onClick={toggleLike} className={`btn-ghost !py-1.5 !px-3 ${liked ? "!text-rose-500" : ""}`} aria-label="ถูกใจ">
          <Icon name="heart" size={17} fill={liked} /> {likeCount}
        </button>
        <Link to={`/post/${post.id}`} className="btn-ghost !py-1.5 !px-3" aria-label="ความคิดเห็น">
          <Icon name="chat" size={17} /> {post.commentCount}
        </Link>
        <button onClick={share} className="btn-ghost !py-1.5 !px-3" aria-label="แชร์"><Icon name="share" size={17} /></button>
        <span className="flex-1" />
        <button onClick={() => setShowReport(true)} className="btn-ghost !py-1.5 !px-3" aria-label="รายงาน"><Icon name="flag" size={17} /></button>
        {(isOwner || isStaff) && (
          <button onClick={deletePost} disabled={busy} className="btn-danger !py-1.5 !px-3" aria-label="ลบโพสต์"><Icon name="trash" size={17} /></button>
        )}
      </div>

      <ImageLightbox images={imgs} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      {showReport && <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />}
    </article>
  );
}
