import { useEffect, useRef } from "react";
import Icon from "./Icon";

/**
 * ดูรูปเต็มจอ: object-contain คงสัดส่วนเดิม ไม่บิดเบี้ยวทุกขนาดภาพ
 * รองรับหลายรูป: ปุ่มซ้าย-ขวา, ปัดนิ้ว, คีย์บอร์ด ← → Esc, ล็อกการเลื่อนหน้าด้านหลัง
 */
export default function ImageLightbox({ images, index, onClose, onChange }) {
  const touchX = useRef(null);
  const open = index !== null && index !== undefined && images?.length > 0;
  const count = images?.length || 0;

  const go = (d) => onChange?.((index + d + count) % count);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
      else if (e.key === "ArrowRight" && count > 1) go(1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  });

  if (!open) return null;
  const img = images[index];

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center animate-popin"
      onClick={onClose}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1);
      }}
      role="dialog" aria-modal="true" aria-label="ดูรูปภาพ"
    >
      <button onClick={onClose} aria-label="ปิด" className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center">
        <Icon name="close" size={22} />
      </button>
      {count > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="รูปก่อนหน้า" className="absolute left-2 z-10 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center">
            <Icon name="left" size={22} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="รูปถัดไป" className="absolute right-2 z-10 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center">
            <Icon name="right" size={22} />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-white/10 px-3 py-1 rounded-full">{index + 1} / {count}</span>
        </>
      )}
      <img
        key={img.url} src={img.url} alt=""
        className="max-h-[92dvh] max-w-[96vw] object-contain select-none"
        onClick={(e) => e.stopPropagation()} draggable={false}
      />
    </div>
  );
}
