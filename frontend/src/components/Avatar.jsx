import { useState } from "react";
import Icon from "./Icon";

// รูปโปรไฟล์: ถ้าไม่มีรูป/รูปโหลดไม่ได้ ใช้รูปสำรอง (ตัวอักษรแรกของชื่อ หรือไอคอนคน) — ไม่ดึงรูปจากแพลตฟอร์มภายนอก
export default function Avatar({ src, name = "", size = 32, className = "" }) {
  const [bad, setBad] = useState(false);
  const initial = (name.match(/[ก-ฮA-Za-z0-9]/) || [""])[0].toUpperCase();
  const box = { width: size, height: size };
  if (src && !bad) {
    return <img src={src} alt="" style={box} onError={() => setBad(true)} draggable={false} className={`rounded-full object-cover bg-slate-200 shrink-0 ${className}`} />;
  }
  return (
    <span style={{ ...box, fontSize: size * 0.45 }} aria-hidden="true" className={`rounded-full bg-brand-600 text-white font-semibold flex items-center justify-center shrink-0 select-none ${className}`}>
      {initial || <Icon name="user" size={size * 0.55} />}
    </span>
  );
}
