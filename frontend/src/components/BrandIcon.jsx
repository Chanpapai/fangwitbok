import Icon from "./Icon";

// ไอคอนแบรนด์ (ใช้ชุด Icon ของเว็บ) ในกรอบมนสีประจำแพลตฟอร์ม: INSTAGRAM | FACEBOOK | DISCORD
const BRAND = {
  INSTAGRAM: { icon: "instagram", bg: "linear-gradient(135deg,#f58529,#dd2a7b 55%,#8134af)", label: "Instagram" },
  FACEBOOK: { icon: "facebook", bg: "#1877f2", label: "Facebook" },
  DISCORD: { icon: "discord", bg: "#5865f2", label: "Discord" },
};

export default function BrandIcon({ platform, size = 24, className = "" }) {
  const b = BRAND[String(platform || "").toUpperCase()];
  if (!b) return null;
  return (
    <span
      role="img" aria-label={b.label}
      className={`inline-flex items-center justify-center shrink-0 text-white ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), background: b.bg }}
    >
      <Icon name={b.icon} size={Math.round(size * 0.62)} strokeWidth={2} />
    </span>
  );
}
