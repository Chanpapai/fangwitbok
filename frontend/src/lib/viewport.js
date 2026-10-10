import { useEffect, useState } from "react";

// ขนาดพื้นที่ที่มองเห็นจริง (หักคีย์บอร์ดเสมือนบน iPhone/Android ออก) — ใช้กับหน้าต่างแชท/แผงที่ต้องไม่ถูกคีย์บอร์ดบัง
export function useVisualViewport(active = true) {
  const read = () => {
    const v = window.visualViewport;
    return { height: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0, full: window.innerHeight };
  };
  const [vp, setVp] = useState(read);
  useEffect(() => {
    if (!active) return;
    const v = window.visualViewport;
    const on = () => setVp(read());
    on();
    v?.addEventListener("resize", on);
    v?.addEventListener("scroll", on);
    window.addEventListener("resize", on);
    return () => { v?.removeEventListener("resize", on); v?.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  // คีย์บอร์ดถือว่าเปิดเมื่อพื้นที่มองเห็นเตี้ยลงเกิน ~22% ของจอ
  return { ...vp, keyboardOpen: vp.height < vp.full * 0.78 };
}
