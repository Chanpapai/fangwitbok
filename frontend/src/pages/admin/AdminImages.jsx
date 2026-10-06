import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { downloadImage } from "../../lib/download";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";
import ImageLightbox from "../../components/ImageLightbox";
import { useDialogs } from "../../components/Dialogs";

// คลังรูปที่แนบมากับโพสต์ทั้งหมด (เฉพาะโพสต์ที่ยังไม่ถูกลบ) ดาวน์โหลดได้ทีละรูป
export default function AdminImages() {
  const { toast } = useDialogs();
  const [images, setImages] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState(null);

  useEffect(() => {
    api.get("/api/admin/images?page=1").then((d) => { setImages(d.images); setHasMore(d.hasMore); }).catch((e) => setError(e.message));
  }, []);

  async function more() {
    try {
      const d = await api.get(`/api/admin/images?page=${page + 1}`);
      setImages((prev) => [...prev, ...d.images.filter((i) => !prev.some((x) => x.id === i.id))]);
      setPage(page + 1);
      setHasMore(d.hasMore);
    } catch (e) { setError(e.message); }
  }

  async function dl(id) {
    setBusyId(id);
    try { await downloadImage(id); } catch (e) { toast(e.message || "ดาวน์โหลดไม่สำเร็จ", "error"); } finally { setBusyId(null); }
  }

  return (
    <div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
      {images === null && !error && <div className="card-post p-4 skeleton h-40" />}
      {images?.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300 text-center py-8">ยังไม่มีรูปที่แนบกับโพสต์</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {images?.map((im, i) => (
          <div key={im.id} className="card-post !rounded-xl overflow-hidden flex flex-col">
            <button onClick={() => setView(i)} className="aspect-square bg-slate-100 dark:bg-ink-900 block" aria-label="ดูรูปเต็มจอ">
              <img src={im.url} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
            <div className="p-2 flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">{timeAgo(im.createdAt)}</p>
                <Link to={`/post/${im.postId}`} className="text-[11px] text-brand-600 dark:text-brand-300 font-semibold">ดูโพสต์</Link>
              </div>
              <button onClick={() => dl(im.id)} disabled={busyId === im.id} className="btn-primary !p-2" aria-label="ดาวน์โหลดรูปนี้"><Icon name="download" size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && <button onClick={more} className="btn-ghost w-full py-3 mt-4">โหลดเพิ่ม</button>}
      <ImageLightbox images={images || []} index={view} onChange={setView} onClose={() => setView(null)} />
    </div>
  );
}
