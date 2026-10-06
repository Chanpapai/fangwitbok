// ไอคอน SVG แบบเส้น (stroke) ใช้แทนอิโมจิทั้งเว็บ — สีตาม currentColor
const P = {
  home: "M3 11l9-8 9 8M5 10v10h14V10",
  feed: "M4 6h16M4 12h16M4 18h10",
  plus: "M12 5v14M5 12h14",
  book: "M5 4h13v16H7a2 2 0 01-2-2V4zM9 8h6M9 12h6",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z",
  moon: "M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z",
  heart: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
  chat: "M4 5h16v11H9l-5 4V5z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  share: "M12 4v12M7 9l5-5 5 5M5 14v6h14v-6",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
  pin: "M12 21s6-5.5 6-11a6 6 0 10-12 0c0 5.5 6 11 6 11zM12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6L6 18",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01",
  send: "M4 12l16-8-6 16-3-7-7-1z",
  megaphone: "M4 10v4h3l8 4V6L7 10H4zM18 9a4 4 0 010 6",
  eyeoff: "M3 3l18 18M10.6 5.1A9 9 0 0121 12a13 13 0 01-3.2 3.9M6.3 6.3A13 13 0 003 12s3.5 6 9 6a8.7 8.7 0 003.4-.7M9.9 9.9a3 3 0 004.2 4.2",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6M22 20a6 6 0 00-4-5.6",
  left: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  logout: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  bell: "M6 17V11a6 6 0 1112 0v6l2 2H4l2-2zM10 21h4",
  edit: "M4 20h4L19 9l-4-4L4 16v4z",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3",
  log: "M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  dashboard: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  text: "M5 6h14M12 6v13M9 19h6",
  headset: "M4 14v-2a8 8 0 0116 0v2M4 13h2.5a1 1 0 011 1v3.5a1 1 0 01-1 1H5a1 1 0 01-1-1V13zM20 13h-2.5a1 1 0 00-1 1v3.5a1 1 0 001 1H19a1 1 0 001-1V13zM20 18.5V19a3 3 0 01-3 3h-3",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  settings: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  menu: "M4 7h16M4 12h16M4 17h16",
  lock: "M7 11V8a5 5 0 0110 0v3M5 11h14v10H5zM12 15v2",
  inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
  gallery: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8.5 8.5h.01",
  eye: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  copy: "M9 9h11v11H9zM5 15V4h11",
  instagram: "M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 8a4 4 0 100 8 4 4 0 000-8zM17.5 6.5h.01",
  facebook: "M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8.5a.5.5 0 01.5-.5z",
  discord: "M8.5 7.5c1.1-.4 2.2-.6 3.5-.6s2.4.2 3.5.6c1.6 2.3 2.4 4.7 2.6 7.6-1 .9-2.2 1.5-3.6 1.9l-.9-1.5M8.5 7.5C6.9 9.8 6.1 12.2 5.9 15.1c1 .9 2.2 1.5 3.6 1.9l.9-1.5M9.7 12.6h.01M14.3 12.6h.01",
  install: "M12 3v11M7 10l5 5 5-5M4 19h16",
  lifebuoy: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 9a3 3 0 100 6 3 3 0 000-6zM5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5",
};

export default function Icon({ name, size = 20, fill = false, className = "", strokeWidth = 1.9 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      fill={fill ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}
    >
      <path d={P[name] || ""} />
    </svg>
  );
}
