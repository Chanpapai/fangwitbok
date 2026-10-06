import { useId } from "react";

// ไอคอนแพลตฟอร์ม (วาดเป็น SVG ในโค้ด ไม่โหลดไฟล์ภายนอก): Instagram / Facebook / Discord
export default function BrandIcon({ platform, size = 24, className = "" }) {
  const gid = useId().replace(/:/g, "");
  const common = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", className: `shrink-0 ${className}` };

  if (platform === "INSTAGRAM") {
    return (
      <svg {...common}>
        <defs>
          <linearGradient id={gid} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#feda75" /><stop offset=".3" stopColor="#fa7e1e" />
            <stop offset=".55" stopColor="#d62976" /><stop offset=".8" stopColor="#962fbf" /><stop offset="1" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill={`url(#${gid})`} />
        <rect x="5.6" y="5.6" width="12.8" height="12.8" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="3.1" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.1" cy="7.9" r=".95" fill="#fff" />
      </svg>
    );
  }
  if (platform === "FACEBOOK") {
    return (
      <svg {...common}>
        <rect width="24" height="24" rx="6" fill="#1877F2" />
        <path fill="#fff" d="M13.5 20.5v-7.3h2.4l.4-2.9h-2.8V8.5c0-.8.3-1.4 1.4-1.4h1.5V4.5c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8.1v2.9h2.4v7.3z" />
      </svg>
    );
  }
  if (platform === "DISCORD") {
    return (
      <svg {...common}>
        <rect width="24" height="24" rx="6" fill="#5865F2" />
        <path fill="#fff" d="M17.6 7.3a12.6 12.6 0 0 0-3.1-1l-.4.8a11.6 11.6 0 0 0-4.2 0l-.4-.8a12.6 12.6 0 0 0-3.1 1C4.4 10.2 3.9 13 4.1 15.8a12.7 12.7 0 0 0 3.9 2l.8-1.3c-.4-.2-.8-.4-1.2-.7l.3-.2a9 9 0 0 0 8.2 0l.3.2c-.4.3-.8.5-1.2.7l.8 1.3a12.7 12.7 0 0 0 3.9-2c.3-3.200-.5-6-2.4-8.500z" />
        <ellipse cx="9.4" cy="12.6" rx="1.45" ry="1.6" fill="#5865F2" />
        <ellipse cx="14.6" cy="12.6" rx="1.45" ry="1.6" fill="#5865F2" />
      </svg>
    );
  }
  return null;
}
