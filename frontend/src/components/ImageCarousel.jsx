import { memo, useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * แสดงรูปทีละ 1 รูป: ปุ่มก่อนหน้า/ถัดไป + ตัวชี้ตำแหน่ง + ปัดนิ้ว
 * - หลายรูป: เลื่อนอัตโนมัติ (วนกลับรูปแรกเมื่อถึงรูปสุดท้าย) จนกว่าผู้ใช้จะเลื่อนเอง แล้วหยุดถาวร
 * - เล่นเฉพาะตอนการ์ดอยู่ในจอและแท็บเปิดอยู่ (ประหยัดแรงเครื่อง)
 * - onOpen: กดรูปเพื่อดูเต็มจอ | ไม่ส่ง = รูปกดไม่ได้ (เช่น Popup)
 * images: [{ url, width?, height? }]
 */
function ImageCarousel({ images, onOpen, interval = 4500, className = "", maxHeight = "max-h-[32rem]", rounded = "rounded-xl" }) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [moved, setMoved] = useState(false); // ผู้ใช้เลื่อนเองแล้ว = เลิกเลื่อนอัตโนมัติ
  const [loadedRatio, setLoadedRatio] = useState(null);
  const box = useRef(null);
  const touchX = useRef(null);

  const first = images[0];
  const ratio = clamp(first?.width && first?.height ? first.width / first.height : loadedRatio || 4 / 3, 0.75, 1.8);

  const go = useCallback((d) => { setMoved(true); setIndex((i) => (i + d + count) % count); }, [count]);

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (count < 2 || moved || !visible || reducedMotion()) return;
    const id = setInterval(() => { if (!document.hidden) setIndex((i) => (i + 1) % count); }, interval);
    return () => clearInterval(id);
  }, [count, moved, visible, interval]);

  if (!count) return null;

  return (
    <div
      ref={box}
      className={`relative overflow-hidden ${rounded} bg-slate-100 border border-slate-200 ${maxHeight} ${className}`}
      style={{ aspectRatio: ratio }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null || count < 2) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1);
      }}
      onContextMenu={onOpen ? undefined : (e) => e.preventDefault()}
      role="group" aria-roledescription="carousel" aria-label="รูปภาพ"
    >
      <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {images.map((im, i) => {
          const img = (
            <img
              src={im.url} alt="" draggable={false}
              loading={i === 0 ? "eager" : "lazy"} decoding="async"
              onLoad={i === 0 && !first.width ? (e) => setLoadedRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight) : undefined}
              className="w-full h-full object-contain select-none"
            />
          );
          return onOpen ? (
            <button key={im.url + i} type="button" onClick={() => onOpen(i)} aria-label={`ดูรูปที่ ${i + 1} เต็มจอ`} tabIndex={i === index ? 0 : -1} className="w-full h-full shrink-0 block cursor-zoom-in">{img}</button>
          ) : (
            <div key={im.url + i} className="w-full h-full shrink-0 pointer-events-none">{img}</div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="รูปก่อนหน้า" className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center active:scale-95"><Icon name="left" size={18} /></button>
          <button type="button" onClick={() => go(1)} aria-label="รูปถัดไป" className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/45 text-white flex items-center justify-center active:scale-95"><Icon name="right" size={18} /></button>
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <button
                key={i} type="button" onClick={() => { setMoved(true); setIndex(i); }} aria-label={`ไปรูปที่ ${i + 1}`} aria-current={i === index}
                className={`pointer-events-auto h-2 rounded-full transition-all ${i === index ? "w-5 bg-white" : "w-2 bg-white/60"} shadow ring-1 ring-black/20`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ImageCarousel);
