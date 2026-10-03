import { useCallback, useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";
import { downloadImage, downloadMany } from "../../lib/download";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";
import ImageLightbox from "../../components/ImageLightbox";

const TYPES = [
  { key: "", label: "ทั้งหมด" },
  { key: "ANNOUNCE", label: "ฝากบอก" },
  { key: "LOST_FOUND", label: "ตามหาของหาย" },
];

export default function AdminPosts() {
  const { reloadStats } = useOutletContext();
  const [type, setType] = useState("");
  const [hasImage, setHasImage] = useState(false);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState(null); // { images, index }

  const fetchPage = useCallback(
    (p) => api.get(`/api/admin/posts?page=${p}${type ? `&type=${type}` : ""}${hasImage ? "&hasImage=1" : ""}${query ? `&q=${encodeURIComponent(query)}` : ""}`),
    [type, hasImage, query]
  );

  useEffect(() => {
    let off = false;
    setPosts(null); setError(""); setPage(1);
    fetchPage(1).then((d) => { if (!off) { setPosts(d.posts); setHasMore(d.hasMore); } }).catch((e) => !off && setError(e.message));
    return () => { off = true; };
  }, [fetchPage]);

  async function more() {
    try {
      const d = await fetchPage(page + 1);
      setPosts((prev) => [...prev, ...d.posts.filter((p) => !prev.some((x) => x.id === p.id))]);
      setPage(page + 1);
      setHasMore(d.hasMore);
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm("ลบโพสต์นี้ (ย้ายเข้าถังขยะ กู้คืนได้ภายใน 15 วัน) ใช่ไหม?")) return;
    setBusyId(id);
    try {
      await api.del(`/api/posts/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      reloadStats();
    } catch (e) { alert(e.message); } finally { setBusyId(null); }
  }

  async function dl(fn) {
    try { await fn(); } catch (e) { alert(e.message || "ดาวน์โหลดไม่สำเร็จ"); }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="card-post p-3 flex flex-col gap-2.5">
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }} className="flex gap-2">
          <input className="input" placeholder="ค้นหาข้อความในโพสต์..." value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} />
          <button className="btn-primary !px-4" aria-label="ค้นหา"><Icon name="search" size={17} /></button>
        </form>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {TYPES.map((t) => <button key={t.key} onClick={() => setType(t.key)} className={`chip ${type === t.key ? "chip-on" : "chip-off"}`}>{t.label}</button>)}
          <button onClick={() => setHasImage(!hasImage)} className={`chip flex items-center gap-1.5 ${hasImage ? "chip-on" : "chip-off"}`}><Icon name="image" size={15} /> มีรูป</button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {posts === null && !error && <div className="card-post p-4 skeleton h-32" />}
      {posts?.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300 text-center py-8">ไม่พบโพสต์</p>}

      {posts?.map((p) => (
        <article key={p.id} className="card-post p-4 pt-5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {p.isAnonymous && <Icon name="eyeoff" size={13} className="inline mr-1 text-slate-500" />}
                {p.authorLabel}{p.authorClass ? ` · ${p.authorClass}` : ""}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-300">{timeAgo(p.createdAt)} · {p.type === "LOST_FOUND" ? "ตามหาของหาย" : "ฝากบอก"}{p.location ? ` · ${p.location}` : ""}</p>
            </div>
            {p.reportCount > 0 && <span className="badge bg-rose-500/15 text-rose-600 dark:text-rose-300"><Icon name="flag" size={12} /> {p.reportCount}</span>}
          </div>

          <p className="text-[15px] leading-relaxed whitespace-pre-line break-words mt-2 line-clamp-5">{p.content}</p>

          {p.images.length > 0 && (
            <div className="mt-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {p.images.map((im, i) => (
                  <div key={im.id} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-ink-900">
                    <button onClick={() => setView({ images: p.images, index: i })} className="w-full h-full block" aria-label="ดูรูป">
                      <img src={im.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                    <button onClick={() => dl(() => downloadImage(im.id))} className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-black/65 text-white flex items-center justify-center hover:bg-brand-500" aria-label="ดาวน์โหลดรูปนี้">
                      <Icon name="download" size={16} />
                    </button>
                  </div>
                ))}
              </div>
              {p.images.length > 1 && (
                <button onClick={() => dl(() => downloadMany(p.images.map((i) => i.id)))} className="btn-ghost text-xs mt-2"><Icon name="download" size={15} /> ดาวน์โหลดทั้ง {p.images.length} รูป</button>
              )}
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-white/10 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1"><Icon name="heart" size={14} /> {p.likeCount}</span>
            <span className="flex items-center gap-1"><Icon name="chat" size={14} /> {p.commentCount}</span>
            <span className="flex-1" />
            <Link to={`/post/${p.id}`} className="btn-ghost !py-1.5 !px-3 text-xs">เปิดดู</Link>
            <button onClick={() => remove(p.id)} disabled={busyId === p.id} className="btn-danger !py-1.5 !px-3 text-xs"><Icon name="trash" size={14} /> ลบ</button>
          </div>
        </article>
      ))}

      {hasMore && <button onClick={more} className="btn-ghost w-full py-3">โหลดเพิ่ม</button>}
      <ImageLightbox images={view?.images || []} index={view ? view.index : null} onChange={(i) => setView((v) => (v ? { ...v, index: i } : v))} onClose={() => setView(null)} />
    </div>
  );
}
