import { useEffect, useState } from "react";

// โลโก้ลอยตกเบา ๆ เป็นพื้นหลัง — สุ่มตำแหน่ง/ขนาด/ความเร็ว อยู่หลังเนื้อหา กดทะลุได้ ไม่บังอะไร
const rand = (a, b) => a + Math.random() * (b - a);

export default function FloatingLogo({ count = 8 }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = window.innerWidth < 640 ? Math.min(count, 5) : count;
    setItems(Array.from({ length: n }).map((_, i) => ({
      id: i, left: rand(2, 92), size: rand(28, 70), duration: rand(22, 40), delay: -rand(0, 40),
      sway: rand(-30, 30), opacity: rand(0.06, 0.16),
    })));
  }, [count]);

  return (
    <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {items.map((it) => (
        <img key={it.id} src="/logo-small.webp" alt="" className="fwb-float"
          style={{ left: `${it.left}%`, width: it.size, opacity: it.opacity, "--dur": `${it.duration}s`, "--delay": `${it.delay}s`, "--sway": `${it.sway}px` }} />
      ))}
    </div>
  );
}
