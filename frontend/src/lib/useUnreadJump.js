import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * คำนวณข้อความที่ยังไม่ได้อ่านในแชท + ปุ่มกระดิ่งเลื่อนไปข้อความค้างอ่านล่าสุด
 * - "อ่านแล้ว" = ข้อความนั้นถูกเลื่อนมาอยู่ในพื้นที่มองเห็นจริง (≥ ครึ่งหนึ่ง) ขณะแท็บเปิดอยู่ ค้างอยู่ ~0.4 วินาที แล้วแจ้ง Backend ผ่าน onMarkRead(ids)
 * - กระดิ่งชี้ไปข้อความค้างอ่านที่ "ใหม่สุด" และซ่อนทันทีเมื่อข้อความนั้นอยู่ในมุมมอง หรือไม่เหลือข้อความค้างอ่าน
 * - กดกระดิ่งแล้วเลื่อนไปถึงข้อความเป้าหมาย: ถือว่าผู้ใช้ตามอ่านถึงล่าสุดแล้ว ข้อความค้างอ่านก่อนหน้านั้นถูกทำเครื่องหมายอ่านด้วย
 * messages ต้องมีฟิลด์ id และ unread (Backend คำนวณให้) และแต่ละข้อความใน DOM ต้องมี data-mid={id}
 */
export function useUnreadJump({ containerRef, messages, onMarkRead, active }) {
  const [readIds, setReadIds] = useState(() => new Set());
  const [visible, setVisible] = useState(() => new Set());
  const jumpingTo = useRef(null);
  const sent = useRef(new Set());
  const timer = useRef(null);

  const unread = useMemo(() => messages.filter((m) => m.unread && !readIds.has(m.id)), [messages, readIds]);
  const target = unread.length ? unread[unread.length - 1] : null;

  useEffect(() => {
    const root = containerRef.current;
    if (!active || !root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      setVisible((prev) => {
        const n = new Set(prev);
        for (const e of entries) {
          const seen = e.isIntersecting && (e.intersectionRatio >= 0.5 || e.intersectionRect.height >= root.clientHeight * 0.5);
          if (seen) n.add(e.target.dataset.mid); else n.delete(e.target.dataset.mid);
        }
        return n;
      });
    }, { root, threshold: [0, 0.5, 1] });
    root.querySelectorAll("[data-mid]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [active, messages, containerRef]);

  const markRead = useCallback((ids) => {
    const fresh = ids.filter((id) => !sent.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => sent.current.add(id));
    setReadIds((prev) => new Set([...prev, ...fresh]));
    Promise.resolve(onMarkRead(fresh)).catch(() => fresh.forEach((id) => sent.current.delete(id))); // ล้มเหลว = ลองใหม่รอบถัดไป
  }, [onMarkRead]);

  // มองเห็นข้อความค้างอ่านค้างไว้สั้น ๆ (และแท็บกำลังเปิดอยู่) = อ่านแล้ว
  useEffect(() => {
    clearTimeout(timer.current);
    if (!active) return;
    const seenNow = unread.filter((m) => visible.has(m.id));
    if (!seenNow.length) return;
    timer.current = setTimeout(() => {
      if (document.visibilityState !== "visible") return;
      let ids = seenNow.map((m) => m.id);
      // เลื่อนมาถึงเป้าหมายที่กดกระดิ่งแล้ว: รวมข้อความค้างอ่านก่อนหน้าเป้าหมายด้วย
      const j = jumpingTo.current;
      if (j && visible.has(j)) {
        const idx = unread.findIndex((m) => m.id === j);
        if (idx >= 0) ids = [...new Set([...ids, ...unread.slice(0, idx + 1).map((m) => m.id)])];
        jumpingTo.current = null;
      }
      markRead(ids);
    }, 400);
    return () => clearTimeout(timer.current);
  }, [visible, unread, active, markRead]);

  const jump = useCallback(() => {
    if (!target) return;
    jumpingTo.current = target.id;
    containerRef.current?.querySelector(`[data-mid="${CSS.escape(target.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [target, containerRef]);

  return { showBell: Boolean(target) && !visible.has(target.id), count: unread.length, jump };
}
