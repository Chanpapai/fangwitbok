// ไอคอนเส้น (stroke) แบบเรียบ ใช้แทนอิโมจิในจุดหลัก ๆ ของ UI
const base = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
const S = ({ children, size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} className={className}>{children}</svg>
);

export const HeartIcon = (p) => <S {...p}><path d="M20.8 4.6c-1.9-1.6-4.7-1.4-6.4.4L12 7.5l-2.4-2.5c-1.7-1.8-4.5-2-6.4-.4-2.1 1.8-2.2 5-.3 7l9.1 9.4 9.1-9.4c1.9-2 1.8-5.2-.3-7z" /></S>;
export const CommentIcon = (p) => <S {...p}><path d="M21 12a8 8 0 1 1-3.5-6.6" /><path d="M21 3v6h-6" style={{ display: "none" }} /><path d="M3 21l1.6-4.8A8 8 0 1 1 21 12" /></S>;
export const ShareIcon = (p) => <S {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" /></S>;
export const FlagIcon = (p) => <S {...p}><path d="M5 3v18" /><path d="M5 4h12l-2.5 4L17 12H5" /></S>;
export const TrashIcon = (p) => <S {...p}><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></S>;
export const SearchIcon = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></S>;
export const MegaphoneIcon = (p) => <S {...p}><path d="M3 11v2a2 2 0 0 0 2 2h1l9 4V5l-9 4H5a2 2 0 0 0-2 2z" /><path d="M15 9.5a3 3 0 0 1 0 5" /></S>;
export const CheckIcon = (p) => <S {...p}><path d="M20 6 9 17l-5-5" /></S>;
export const SunIcon = (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>;
export const MoonIcon = (p) => <S {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></S>;
export const ChatHelpIcon = (p) => <S {...p}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4A8.8 8.8 0 0 1 8 19l-4 1 1.2-3.6A8.4 8.4 0 1 1 21 11.5z" /><path d="M12 10.5v.01M9.2 9a2.8 2.8 0 1 1 3.8 2.6c-.7.3-1 .8-1 1.4" style={{ display: "none" }} /></S>;
export const CloseIcon = (p) => <S {...p}><path d="M6 6l12 12M18 6 6 18" /></S>;
export const SendIcon = (p) => <S {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4 20-7z" /></S>;
export const RuleIcon = (p) => <S {...p}><path d="M6 3h9l3 3v15H6z" /><path d="M9 9h6M9 13h6M9 17h4" /></S>;
