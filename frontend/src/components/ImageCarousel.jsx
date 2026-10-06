import { memo, useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

/**
 * Carousel/Slideshow แสดงรูปทีละ 1 รูป: ปุ่ม ก่อนหน้า/ถัดไป + จุด Indicator + ปัดนิ้ว + คีย์บอร์ด ← →
 * - เลื่อนอัตโนมัติ (autoplay) เมื่อมีหลายรูป: นับเวลาใหม่ทุกครั้งที่ผู้ใช้เลื่อนเอง, หยุดเมื่อชี้/แตะ/โฟกัส/ออกนอกจอ/ซ่อนแท็บ/ตั้งค่าลดการเคลื่อนไหว
 * - ถึงรูปสุดท้ายแล้ววนกลับรูปแรก
 * - เรนเดอร์ <img> เฉพาะรูปปัจจุบัน (+ โหลดรูปถัดไปล่วงหน้า) จึงไม่โหลดทุกรูปพร้อมกัน และการ์ดไม่สูงเกินเพราะกล่องอัตราส่วนคงที่
 * - onOpen(index) ถ้าส่งมา = กดรูปเพื่อดูเต็มจอได้ / ไม่ส่ง = กดรูปไม่ได้ (เช่น Popup)
 * - natural = กล่องสูงตามสัดส่วนรูปจริง (ใช้กับ Popup แบบรูปเต็มพื้นที่)
 */
function ImageCarousel({ images, onOpen, autoplay = true, interval = 4500, natural = false, label = "รูปภาพ" }) {
  const count = images.length;
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [inView, setInView] = useState(true);
  const [held, setHeld] = useState(false);
  const box = useRef(null);
  const touch = useRef(null);
  const cur = Math.min(i, Math.max(count - 1, 0));
  const nextUrl = count > 1 ? images[(cur + 1) % count].url : null;

  const go = useCallback((d) => setI((c) => (Math.min(c, count - 1) + d + count) % count), [count]);

  // ทำงานเมื่อการ์ดอยู่ในจอเท่านั้น (ประหยัด CPU/แบตเมื่อมีหลายโพสต์ในฟีด)
  useEffect(() => {
    const el = box.current;
    if (count < 2 || !autoplay || !el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [count, autoplay]);

  // ตัวจับเวลา: ผูกกับ cur จึงเริ่มนับใหม่ทุกครั้งที่เปลี่ยนรูป (รวมถึงตอนผู้ใช้เลื่อนเอง)
  useEffect(() => {
    if (count < 2 || !autoplay || !inView || held) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setTimeout(() => (document.hidden ? setTick((t) => t + 1) : go(1)), interval);
    return () => clearTimeout(id);
  }, [cur, tick, count, autoplay, inView, held, interval, go]);

  // โหลดรูปถัดไปล่วงหน้า ให้สไลด์ต่อเนื่อง
  useEffect(() => {
    if (!nextUrl || !inView) return;
    const im = new Image();
    im.decoding = "async";
    im.src = nextUrl;
  }, [nextUrl, inView]);

  if (count === 0) return null;
  const im = images[cur];
  // หยุดชั่วคราวเฉพาะ "เมาส์ชี้อยู่" หรือ "โฟกัสด้วยคีย์บอร์ด" (ไม่ใช้กับการแตะบนมือถือ ไม่งั้นเลื่อนอัตโนมัติจะค้างหลังแตะปุ่ม)
  const pressed = {
    onPointerEnter: (e) => e.pointerType === "mouse" && setHeld(true),
    onPointerLeave: (e) => e.pointerType === "mouse" && setHeld(false),
    onFocus: (e) => e.target.matches?.(":focus-visible") && setHeld(true),
    onBlur: () => setHeld(false),
  };

  function onTouchStart(e) { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; setHeld(true); }
  function onTouchEnd(e) {
    const s = touch.current;
    touch.current = null;
    setHeld(false);
    if (!s || count < 2) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx > 0 ? -1 : 1);
  }
  function onKeyDown(e) {
    if (count < 2) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  }

  const imgClass = natural
    ? "block w-full h-auto max-h-[78dvh] object-contain animate-fade"
    : "absolute inset-0 w-full h-full object-contain animate-fade";
  const img = (
    <img
      key={im.url} src={im.url} alt="" decoding="async" loading="lazy" draggable={false}
      width={natural ? im.width || undefined : undefined} height={natural ? im.height || undefined : undefined}
      onContextMenu={onOpen ? undefined : (e) => e.preventDefault()}
      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
      className={`${imgClass} select-none ${onOpen ? "" : "pointer-events-none"}`}
    />
  );

  const arrow = "absolute top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/70 outline-none focus-visible:ring-2 focus-visible:ring-white";
  return (
    <div
      ref={box} role="group" aria-roledescription="carousel" aria-label={`${label} ${cur + 1} จาก ${count}`}
      tabIndex={count > 1 ? 0 : undefined} onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onTouchCancel={() => { touch.current = null; setHeld(false); }}
      {...pressed}
      className={`relative overflow-hidden outline-none ${natural ? "" : "w-full aspect-[4/3] rounded-xl border border-slate-200 bg-slate-100"}`}
    >
      {onOpen ? (
        <button type="button" onClick={() => onOpen(cur)} aria-label="ดูรูปเต็มจอ" className={`${natural ? "block w-full" : "absolute inset-0 w-full h-full"} cursor-zoom-in`}>
          {img}
        </button>
      ) : img}

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="รูปก่อนหน้า" className={`${arrow} left-1.5`}><Icon name="left" size={18} strokeWidth={2.5} /></button>
          <button type="button" onClick={() => go(1)} aria-label="รูปถัดไป" className={`${arrow} right-1.5`}><Icon name="right" size={18} strokeWidth={2.5} /></button>
          <div className="absolute bottom-1.5 inset-x-0 flex justify-center pointer-events-none">
            <div className="pointer-events-auto flex items-center rounded-full bg-black/50 px-1.5">
              {images.map((_, n) => (
                <button key={n} type="button" onClick={() => setI(n)} aria-label={`ไปรูปที่ ${n + 1}`} aria-current={n === cur} className="w-5 h-6 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
                  <span className={`block h-1.5 rounded-full transition-all ${n === cur ? "w-4 bg-white" : "w-1.5 bg-white/65"}`} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ImageCarousel);
