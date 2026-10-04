import { useSite } from "../context/SiteContext";

// โลโก้ FangBok.V2 ลอย/ตกลงมาช้า ๆ เป็นพื้นหลัง: หลายขนาด โปร่งบาง ไม่รับ pointer (ไม่บังปุ่ม/ข้อความ)
// ปิดอัตโนมัติเมื่อผู้ใช้ตั้งค่า "ลดการเคลื่อนไหว" ในระบบ (ดู index.css)
const ITEMS = [
  { left: 6, w: 96, dur: 46, delay: -8, dx: 18, r0: -12, r1: 8, o: 0.1 },
  { left: 22, w: 150, dur: 62, delay: -34, dx: -26, r0: 6, r1: -10, o: 0.07 },
  { left: 38, w: 70, dur: 40, delay: -20, dx: 14, r0: -6, r1: 12, o: 0.12 },
  { left: 52, w: 120, dur: 58, delay: -2, dx: -18, r0: 10, r1: -6, o: 0.08 },
  { left: 66, w: 84, dur: 44, delay: -27, dx: 22, r0: -9, r1: 5, o: 0.1 },
  { left: 80, w: 140, dur: 66, delay: -48, dx: -22, r0: 4, r1: -12, o: 0.07 },
  { left: 90, w: 64, dur: 38, delay: -14, dx: 12, r0: -4, r1: 9, o: 0.12 },
  { left: 14, w: 60, dur: 36, delay: -30, dx: -10, r0: 8, r1: -5, o: 0.1 },
];

export default function FloatingLogos() {
  const { logoSm } = useSite();
  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {ITEMS.map((it, i) => (
        <img
          key={i}
          src={logoSm}
          alt=""
          width={it.w}
          draggable={false}
          loading="lazy"
          className="fwb-float"
          style={{
            left: `${it.left}%`,
            width: it.w,
            opacity: it.o,
            "--dur": `${it.dur}s`,
            "--delay": `${it.delay}s`,
            "--dx": `${it.dx}vw`,
            "--r0": `${it.r0}deg`,
            "--r1": `${it.r1}deg`,
            "--static-y": `${10 + i * 11}vh`,
          }}
        />
      ))}
    </div>
  );
}
