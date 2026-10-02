export default function ImageLightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 animate-popin"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="ปิด"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-2xl leading-none"
      >
        ×
      </button>
      <img src={src} alt="" className="max-h-[88vh] max-w-full object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
