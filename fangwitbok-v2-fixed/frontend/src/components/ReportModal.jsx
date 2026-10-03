import { useState } from "react";
import { api } from "../lib/api";
import Icon from "./Icon";

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (reason.trim().length < 3) return setError("กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร");
    setBusy(true);
    setError("");
    try {
      await api.post("/api/reports", { targetType, targetId, reason: reason.trim() });
      setDone(true);
    } catch (err) {
      setError(err.message || "ส่งรายงานไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card w-full max-w-sm p-5 animate-sheet !bg-white dark:!bg-ink-800" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className="font-bold text-lg flex items-center gap-2"><Icon name="check" className="text-emerald-500" /> ส่งรายงานแล้ว</p>
            <p className="text-sm text-slate-500 mt-1">ทีมแอดมินจะตรวจสอบเนื้อหานี้</p>
            <button onClick={onClose} className="btn-primary w-full mt-4">ปิด</button>
          </>
        ) : (
          <form onSubmit={submit}>
            <p className="font-bold text-lg flex items-center gap-2"><Icon name="flag" /> รายงานเนื้อหา</p>
            <textarea className="input mt-3" rows={4} maxLength={500} placeholder="เหตุผลที่รายงาน เช่น เนื้อหาไม่เหมาะสม/สแปม" value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">ยกเลิก</button>
              <button type="submit" disabled={busy} className="btn-danger flex-1">{busy ? "กำลังส่ง..." : "ส่งรายงาน"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
