import Icon from "./Icon";

// ปุ่มกระดิ่ง: วางทับมุมขวาล่างของรายการข้อความ (อยู่เหนือช่องพิมพ์ ไม่บังปุ่มส่ง) — แสดงเฉพาะเมื่อมีข้อความค้างอ่านนอกมุมมอง
export default function UnreadBell({ show, count, onClick }) {
  if (!show) return null;
  return (
    <button type="button" onClick={onClick} aria-label={`เลื่อนไปข้อความใหม่ที่ยังไม่ได้อ่าน (${count})`}
      className="absolute right-3 bottom-3 z-10 h-11 pl-3 pr-3.5 rounded-full bg-brand-600 text-white shadow-lg shadow-black/25 flex items-center gap-1.5 text-sm font-semibold animate-popin active:scale-95">
      <Icon name="bell" size={19} />
      <span className="min-w-[1.25rem] text-center">{count}</span>
    </button>
  );
}
