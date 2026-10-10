import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../lib/format";
import Icon from "./Icon";
import ImageCarousel from "./ImageCarousel";
import ImageLightbox from "./ImageLightbox";
import ReportModal from "./ReportModal";
import ShareSheet from "./ShareSheet";
import { useDialog } from "./DialogProvider";

// onWhite = ใช้บนการ์ดโพสต์ (พื้นขาวทั้งสองโหมด) → สีตัวอักษรคงที่ ไม่ขึ้นกับโหมดมืด
export function AuthorLine({ author, createdAt, onWhite = false }) {
  const muted = onWhite ? "text-slate-600" : "text-slate-500 dark:text-slate-300";
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-sm truncate flex items-center gap-1.5">
        {author.anonymous && <Icon name="eyeoff" size={14} className={muted} />}
        <span className={author.anonymous ? muted : ""}>{author.name}</span>
        {author.className && <span className={`font-normal ${muted}`}>· {author.className}</span>}
      </p>
      <p className={`text-xs ${onWhite ? "text-slate-600" : "text-slate-500 dark:text-slate-300/80"}`}>{timeAgo(createdAt)}</p>
    </div>
  );
}

const CONTACT = {
  INSTAGRAM: { icon: "instagram", label: "ติดต่อกลับทาง Instagram", tone: "text-pink-600" },
  FACEBOOK: { icon: "facebook", label: "ติดต่อกลับทาง Facebook", tone: "text-blue-600" },
};

function PostCard({ post, onChanged, detailed = false }) {
  const { isStaff } = useAuth();
  const { confirm, notify } = useDialog();
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [lightbox, setLightbox] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [busy, setBusy] = useState(false);

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

  // ผู้เข้าชมทั่วไปลบโพสต์เองไม่ได้ — ปุ่มนี้แสดงเฉพาะทีมงาน (และ Backend ตรวจสิทธิ์ซ้ำเสมอ)
  async function deletePost() {
    const ok = await confirm({
      title: "ลบโพสต์นี้ใช่ไหม?",
      message: "โพสต์จะถูกย้ายเข้าถังขยะ และกู้คืนได้ภายใน 15 วัน",
      confirmText: "ลบโพสต์", tone: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.del(`/api/posts/${post.id}`);
      onChanged?.(null);
    } catch (err) {
      notify(err.message);
    } finally {
      setBusy(false);
    }
  }

  // แชร์: ใช้ Web Share API ของเครื่อง (เลือกแอปได้) ถ้าไม่รองรับ/ผิดพลาด เปิดตัวเลือกสำรอง (LINE, Facebook, X, คัดลอกลิงก์)
  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "FangwitBok ฝากวิทฝากบอก", text: post.content.slice(0, 80), url });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return; // ผู้ใช้ยกเลิกเอง
      }
    }
    setShowShare(true);
  }

  const imgs = post.images || [];
  const lost = post.type === "LOST_FOUND";
  const contact = post.contact && CONTACT[post.contact.type] ? { ...CONTACT[post.contact.type], url: post.contact.url } : null;

  return (
    <article className="card-post post-white p-4 pt-5">
      <div className="flex items-center gap-2">
        <AuthorLine author={post.author} createdAt={post.createdAt} onWhite />
        {contact && (
          <a
            href={contact.url} target="_blank" rel="noopener noreferrer nofollow ugc" aria-label={contact.label} title={contact.label}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0"
          >
            <Icon name={contact.icon} size={17} className={contact.tone} />
          </a>
        )}
        <span className={`badge ${lost ? "bg-amber-100 text-amber-800" : "bg-brand-500/10 text-brand-700"}`}>
          <Icon name={lost ? "search" : "megaphone"} size={12} />
          {lost ? "ตามหาของหาย" : "ฝากบอก"}
        </span>
      </div>

      {lost && post.location && (
        <p className="mt-2.5 text-xs text-slate-700 flex items-center gap-1"><Icon name="pin" size={13} /> {post.location}</p>
      )}

      <Link to={`/post/${post.id}`} className="block mt-2.5">
        <p className={`text-[15px] leading-relaxed whitespace-pre-line break-words text-slate-900 ${detailed ? "" : "line-clamp-6"}`}>{post.content}</p>
      </Link>

      {imgs.length > 0 && <ImageCarousel className="mt-3" images={imgs} onOpen={setLightbox} />}

      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center gap-1 text-sm text-slate-700">
        <button onClick={toggleLike} className={`btn-ghost !py-1.5 !px-3 ${liked ? "!text-rose-600" : ""}`} aria-label="ถูกใจ">
          <Icon name="heart" size={17} fill={liked} /> {likeCount}
        </button>
        <Link to={`/post/${post.id}`} className="btn-ghost !py-1.5 !px-3" aria-label="ความคิดเห็น">
          <Icon name="chat" size={17} /> {post.commentCount}
        </Link>
        <button onClick={share} className="btn-ghost !py-1.5 !px-3" aria-label="แชร์โพสต์"><Icon name="share" size={17} /></button>
        <span className="flex-1" />
        <button onClick={() => setShowReport(true)} className="btn-ghost !py-1.5 !px-3" aria-label="รายงาน"><Icon name="flag" size={17} /></button>
        {isStaff && (
          <button onClick={deletePost} disabled={busy} className="btn-danger !py-1.5 !px-3" aria-label="ลบโพสต์ (ทีมงาน)"><Icon name="trash" size={17} /></button>
        )}
      </div>

      <ImageLightbox images={imgs} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      {showReport && <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />}
      {showShare && <ShareSheet url={`${window.location.origin}/post/${post.id}`} text={post.content.slice(0, 80)} onClose={() => setShowShare(false)} />}
    </article>
  );
}

export default memo(PostCard);
