import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { timeAgo } from "../lib/format";
import { safeSocialUrl, SOCIAL_LABEL } from "../lib/social";
import Icon from "./Icon";
import BrandIcon from "./BrandIcon";
import ImageCarousel from "./ImageCarousel";
import ImageLightbox from "./ImageLightbox";
import ReportModal from "./ReportModal";
import { useDialogs } from "./Dialogs";

export function AuthorLine({ author, createdAt }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-sm truncate flex items-center gap-1.5">
        {author.anonymous && <Icon name="eyeoff" size={14} className="text-slate-500" />}
        <span className={author.anonymous ? "text-slate-600" : ""}>{author.name}</span>
        {author.className && <span className="font-normal text-slate-500">· {author.className}</span>}
      </p>
      <p className="text-xs text-slate-500">{timeAgo(createdAt)}</p>
    </div>
  );
}

// ช่องทางแชร์สำรอง (เมื่อเบราว์เซอร์ไม่รองรับ Web Share API): คัดลอกลิงก์ + เปิดแอป/เว็บของแพลตฟอร์มที่นิยม
function ShareSheet({ url, text, onClose }) {
  const { toast } = useDialogs();
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const targets = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, platform: "FACEBOOK" },
    { label: "LINE", href: `https://social-plugins.line.me/lineit/share?url=${u}`, color: "#06C755" },
    { label: "X (Twitter)", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, color: "#111" },
  ];
  useEffect(() => {
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast("คัดลอกลิงก์โพสต์แล้ว", "success");
    } catch {
      toast("คัดลอกไม่สำเร็จ กรุณากดค้างที่ลิงก์เพื่อคัดลอกเอง", "error");
    }
    onClose();
  }
  const row = "flex items-center gap-3 px-3.5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="แชร์โพสต์" className="w-full max-w-sm rounded-2xl bg-white text-slate-900 shadow-2xl p-4 animate-sheet">
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-lg">แชร์โพสต์</p>
          <button onClick={onClose} aria-label="ปิด" className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center"><Icon name="close" size={18} /></button>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={copy} className={row}><Icon name="copy" size={22} /> คัดลอกลิงก์</button>
          {targets.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer" onClick={onClose} className={row}>
              {x.platform ? <BrandIcon platform={x.platform} size={22} /> : <span className="w-[22px] h-[22px] rounded-md shrink-0" style={{ background: x.color }} />}
              {x.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, onChanged, detailed = false }) {
  const { isStaff } = useAuth();
  const { confirm, toast } = useDialogs();
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
      title: "ลบโพสต์นี้?", message: "โพสต์จะถูกย้ายเข้าถังขยะ และกู้คืนได้ภายใน 15 วัน",
      confirmText: "ลบโพสต์", tone: "danger", icon: "trash",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.del(`/api/posts/${post.id}`);
      onChanged?.(post.id, null);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  // แชร์ผ่าน Web Share API (เมนูแชร์ของเครื่อง: LINE, Instagram, Facebook ฯลฯ) — ไม่รองรับ/ผิดพลาด = เปิดเมนูแชร์สำรอง
  async function share() {
    const url = `${window.location.origin}/post/${post.id}`;
    const data = { title: "FangwitBok", text: post.content.slice(0, 100), url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try { await navigator.share(data); return; }
      catch (e) { if (e?.name === "AbortError") return; }
    }
    setShowShare(true);
  }

  const imgs = post.images || [];
  const lost = post.type === "LOST_FOUND";
  // แสดงไอคอนเฉพาะลิงก์ Instagram/Facebook ที่ผ่านการตรวจ (กันค่าแปลกปลอม) — ไม่เปิดเผยข้อมูลอื่น
  const contactUrl = post.contact ? safeSocialUrl(post.contact.url, [post.contact.type]) : null;

  return (
    <article className="card-post p-4 pt-5">
      <div className="flex items-center gap-2">
        <AuthorLine author={post.author} createdAt={post.createdAt} />
        {contactUrl && (
          <a href={contactUrl} target="_blank" rel="noopener noreferrer nofollow" aria-label={`ติดต่อผู้โพสต์ทาง ${SOCIAL_LABEL[post.contact.type]}`} title={`ติดต่อกลับทาง ${SOCIAL_LABEL[post.contact.type]}`} className="shrink-0 rounded-lg active:scale-90 transition">
            <BrandIcon platform={post.contact.type} size={28} />
          </a>
        )}
        <span className={`badge ${lost ? "bg-amber-100 text-amber-800" : "bg-brand-100 text-brand-700"}`}>
          <Icon name={lost ? "search" : "megaphone"} size={12} />
          {lost ? "ตามหาของหาย" : "ฝากบอก"}
        </span>
      </div>

      {lost && post.location && (
        <p className="mt-2.5 text-xs text-slate-600 flex items-center gap-1"><Icon name="pin" size={13} /> {post.location}</p>
      )}

      <Link to={`/post/${post.id}`} className="block mt-2.5">
        <p className={`text-[15px] leading-relaxed whitespace-pre-line break-words text-slate-900 ${detailed ? "" : "line-clamp-6"}`}>{post.content}</p>
      </Link>

      {/* รูปแสดงทีละ 1 รูป: Carousel + ปุ่มก่อนหน้า/ถัดไป + Indicator + เลื่อนอัตโนมัติ วนกลับรูปแรก */}
      {imgs.length > 0 && (
        <div className="mt-3">
          <ImageCarousel images={imgs} onOpen={setLightbox} label="รูปในโพสต์" />
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center gap-1 text-sm text-slate-600">
        <button onClick={toggleLike} className={`btn-ghost !py-1.5 !px-3 ${liked ? "!text-rose-600" : ""}`} aria-label="ถูกใจ" aria-pressed={liked}>
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

      {lightbox !== null && <ImageLightbox images={imgs} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />}
      {showReport && <ReportModal targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />}
      {showShare && <ShareSheet url={`${window.location.origin}/post/${post.id}`} text={post.content.slice(0, 100)} onClose={() => setShowShare(false)} />}
    </article>
  );
}

// memo: การ์ดที่ข้อมูลไม่เปลี่ยนจะไม่เรนเดอร์ใหม่ตอนโหลดหน้าเพิ่ม/กดไลก์โพสต์อื่น
export default memo(PostCard);
