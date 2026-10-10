import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ImageLightbox from "../components/ImageLightbox";
import Icon from "../components/Icon";

export default function Rules() {
  const [blocks, setBlocks] = useState(null);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.get("/api/rules").then((d) => setBlocks(d.blocks)).catch((e) => setError(e.message));
  }, []);

  const images = (blocks || []).filter((b) => b.type === "IMAGE" && b.imageUrl).map((b) => ({ url: b.imageUrl }));

  return (
    <div className="relative z-10 max-w-xl mx-auto px-4 py-5 pb-28">
      <h1 className="font-bold text-xl mb-4 flex items-center gap-2"><Icon name="book" size={22} className="text-brand-500" /> กฎการฝากบอก</h1>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {blocks === null && !error && <div className="card p-4 skeleton h-40" />}
      {blocks?.length === 0 && <div className="card p-6 text-center text-sm text-slate-400">แอดมินยังไม่ได้เพิ่มกฎการใช้งาน</div>}
      <div className="flex flex-col gap-3">
        {blocks?.map((b) =>
          b.type === "TEXT" ? (
            <div key={b.id} className="card p-4"><p className="text-[15px] leading-relaxed whitespace-pre-line break-words">{b.text}</p></div>
          ) : b.imageUrl ? (
            <button key={b.id} onClick={() => setLightbox(images.findIndex((i) => i.url === b.imageUrl))} className="card overflow-hidden block" aria-label="ดูรูปเต็มจอ">
              <img src={b.imageUrl} alt={b.text || "กฎการใช้งาน"} loading="lazy" className="w-full h-auto object-contain" />
              {b.text && <p className="text-xs text-slate-500 p-3 text-left">{b.text}</p>}
            </button>
          ) : null
        )}
      </div>
      <ImageLightbox images={images} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
