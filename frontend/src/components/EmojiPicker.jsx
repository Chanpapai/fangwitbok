import { useState } from "react";

// แผงอิโมจิ (ไม่พึ่งไลบรารีภายนอก): แสดง "ในแนวเดียวกับเนื้อหา" เหนือช่องพิมพ์ — ไม่ลอยทับช่องพิมพ์/ปุ่มส่ง และใช้ได้บนมือถือ
const CATS = [
  ["😀", "หน้ายิ้ม", "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤔 🤭 🤫 🙄 😬 😴 🤒 🤕"],
  ["👍", "ท่าทาง", "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🙏 🤝 💪 🫶 ✍️ 🤳 🙋 🙇 🤷 🤦 💁 🙆 🙅"],
  ["❤️", "หัวใจ", "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ✨ 🌟 ⭐ 🔥 💯 💢 💥 💫 💦 🎉 🎊 🎈 🎁"],
  ["🐶", "สัตว์/ธรรมชาติ", "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦆 🦉 🐢 🐍 🐙 🐠 🐬 🦋 🐝 🌸 🌼 🌻 🌹 🌳 🍀 🌈 ☀️ 🌙 ⛅ ☔ ❄️"],
  ["🍜", "อาหาร", "🍜 🍚 🍛 🍣 🍕 🍔 🍟 🌭 🥪 🌮 🍗 🍖 🥩 🥚 🍳 🥗 🍿 🍩 🍪 🍰 🧁 🍫 🍬 🍭 🍦 🍎 🍊 🍌 🍉 🍇 🍓 🥭 🍍 🥤 🧋 ☕ 🍵 🍺"],
  ["⚽", "กิจกรรม/ของใช้", "⚽ 🏀 🏐 🏸 🏓 🎾 🏊 🚴 🏃 🎮 🎧 🎤 🎸 🎹 🎬 📚 ✏️ 📝 🎒 💡 📱 💻 📷 🔑 👓 👕 👟 🚌 🚲 🏫 🔍 📍"],
  ["✅", "สัญลักษณ์", "✅ ❌ ⭕ ❗ ❓ ‼️ ⚠️ 🚫 💬 💭 🔔 📢 🆘 🆗 🆕 🔝 ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ ♻️ ✔️ ☑️ 🔴 🟠 🟡 🟢 🔵 🟣"],
];
const RECENT_KEY = "fwb_emoji_recent";
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 16); } catch { return []; } };

/** แทรกอิโมจิตรงตำแหน่งเคอร์เซอร์ของ textarea/input (el) โดยไม่ดึงโฟกัส จึงไม่เด้งคีย์บอร์ดขึ้นมาซ้ำ */
export function insertEmoji(el, value, emoji, setValue) {
  const s = el?.selectionStart ?? value.length;
  const e = el?.selectionEnd ?? s;
  const next = value.slice(0, s) + emoji + value.slice(e);
  if (el?.maxLength > 0 && next.length > el.maxLength) return;
  setValue(next);
  requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = s + emoji.length; } catch { /* ไม่เป็นไร */ } });
}

export function EmojiToggle({ open, onClick, className = "" }) {
  return (
    <button type="button" onClick={onClick} aria-label={open ? "ปิดแผงอิโมจิ" : "เปิดแผงอิโมจิ"} aria-expanded={open} aria-haspopup="true"
      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[22px] leading-none transition active:scale-90 ${open ? "bg-brand-600/15 ring-2 ring-brand-500/50" : "bg-slate-100 dark:bg-white/[0.1] hover:bg-slate-200 dark:hover:bg-white/[0.16]"} ${className}`}>
      <span aria-hidden="true">😊</span>
    </button>
  );
}

export default function EmojiPicker({ onPick, className = "" }) {
  const [cat, setCat] = useState(0);
  const [recent, setRecent] = useState(loadRecent);

  function pick(em) {
    onPick(em);
    const next = [em, ...recent.filter((x) => x !== em)].slice(0, 16);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ไม่เป็นไร */ }
  }
  const list = CATS[cat][2].split(" ");
  const keep = (e) => e.preventDefault(); // กดแล้วไม่ดึงโฟกัสออกจากช่องพิมพ์

  return (
    <div role="group" aria-label="แผงอิโมจิ" className={`rounded-2xl bg-slate-100 dark:bg-white/[0.07] border border-slate-200/70 dark:border-white/10 overflow-hidden ${className}`}>
      <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 dark:border-white/10" role="tablist">
        {CATS.map(([icon, label], i) => (
          <button key={label} type="button" role="tab" aria-selected={cat === i} aria-label={label} onMouseDown={keep} onClick={() => setCat(i)}
            className={`shrink-0 w-11 h-10 text-xl flex items-center justify-center transition ${cat === i ? "bg-white dark:bg-white/15" : "opacity-70 hover:opacity-100"}`}>
            <span aria-hidden="true">{icon}</span>
          </button>
        ))}
      </div>
      <div className="h-[9.5rem] overflow-y-auto overscroll-contain p-1.5">
        {recent.length > 0 && cat === 0 && (
          <div className="mb-1 pb-1 border-b border-slate-200 dark:border-white/10">
            <p className="text-[11px] text-slate-600 dark:text-slate-300 px-1">ใช้ล่าสุด</p>
            <div className="grid grid-cols-8">{recent.map((em) => <EmojiCell key={`r${em}`} em={em} onPick={pick} keep={keep} />)}</div>
          </div>
        )}
        <div className="grid grid-cols-8">{list.map((em) => <EmojiCell key={em} em={em} onPick={pick} keep={keep} />)}</div>
      </div>
    </div>
  );
}

function EmojiCell({ em, onPick, keep }) {
  return (
    <button type="button" onMouseDown={keep} onClick={() => onPick(em)} aria-label={em} className="h-10 text-[24px] leading-none rounded-lg flex items-center justify-center hover:bg-white dark:hover:bg-white/15 active:scale-90 transition">
      {em}
    </button>
  );
}
