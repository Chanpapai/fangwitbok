import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { getOwnerToken } from "../lib/identity";
import ImageLightbox from "./ImageLightbox";
import ReportModal from "./ReportModal";
import { HeartIcon, CommentIcon, ShareIcon, FlagIcon, TrashIcon, CheckIcon, SearchIcon } from "./Icons";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
}

export default function PostCard({ post, onChanged, detailed = false }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [lightbox, setLightbox] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [busy, setBusy] = useState(false);

  const ownerHeaders = () => ({ "x-owner-token": getOwnerToken("post", post.id) || "" });

  async function toggleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    try {
      const data = await api.post(`/api/posts/${post.id}/like`);
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch {
      setLiked((v) => !v);
      setLikeCount((c) => c + (liked ? 1 : -1));
    }
  }

  async function toggleLostStatus() {
    setBusy(true);
    try {
      const data = await api.patch(`/api/posts/${post.id}/lost-status`, undefined, ownerHeaders());
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
      await api.del(`/api/posts/${post.id}`, ownerHeaders());
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
    else { await navigator.clipboard.writeText(url); alert("คัดลอกลิงก์โพสต์แล้ว"); }
  }

  return (
    <article className="card p-4">
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{post.author.displayName}</p>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <span className={`badge ${post.type === "LOST_FOUND" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" : "bg-brand-100 text-brand-700 dark:bg-slate-800 dark:text-brand-400"}`}>
          {post.type === "LOST_FOUND" ? "ตามหาของหาย" : "ฝากบอก"}
        </span>
      </div>

      {post.type === "LOST_FOUND" && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={`badge inline-flex items-center gap-1 ${post.lostStatus === "FOUND" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300"}`}>
            {post.lostStatus === "FOUND" ? <CheckIcon size={12} /> : <SearchIcon size={12} />}
            {post.lostStatus === "FOUND" ? "เจอของแล้ว" : "ยังไม่เจอ"}
          </span>
          {post.location && <span className="text-xs text-slate-500">{post.location}</span>}
          {post.canManage && (
            <button onClick={toggleLostStatus} disabled={busy} className="btn-ghost !py-1 !px-2.5 text-xs">สลับสถานะ</button>
          )}
        </div>
      )}

      <Link to={`/post/${post.id}`} className="block mt-2">
        <p className={`text-sm whitespace-pre-line break-words ${detailed ? "" : "line-clamp-6"}`}>{post.content}</p>
      </Link>

      {post.images?.length > 0 && (
        <div className={`mt-3 grid gap-1.5 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.map((url) => (
            <button key={url} onClick={() => setLightbox(url)} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src={url} alt="" loading="lazy" className="w-full max-h-72 object-contain bg-slate-100 dark:bg-slate-800" />
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 text-sm text-slate-500">
        <button onClick={toggleLike} className={`btn-ghost !py-1.5 !px-3 inline-flex items-center gap-1 ${liked ? "!text-red-500" : ""}`}>
          <HeartIcon size={16} /> {likeCount}
        </button>
        <Link to={`/post/${post.id}`} className="btn-ghost !py-1.5 !px-3 inline-flex items-center gap-1">
          <CommentIcon size={16} /> {post.commentCount}
        </Link>
        <button onClick={share} className="btn-ghost !py-1.5 !px-3"><ShareIcon size={16} /></button>
        <button onClick={() => setShowReport(true)} className="btn-ghost !py-1.5 !px-3 ml-auto"><FlagIcon size={16} /></button>
        {post.canManage && (
          <button onClick={deletePost} disabled={busy} className="btn-ghost !py-1.5 !px-3 !text-red-500"><TrashIcon size={16} /></button>
        )}
      </div>

      <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />
      {showReport && <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />}
    </article>
  );
}
