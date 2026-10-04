import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Rules() {
  const [blocks, setBlocks] = useState(null);
  useEffect(() => { api.get("/api/rules").then((d) => setBlocks(d.blocks)).catch(() => setBlocks([])); }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-4 pb-28">
      <h1 className="font-bold text-xl mb-4">กฎการฝากบอก</h1>
      {blocks === null && <p className="text-sm text-slate-400 text-center">กำลังโหลด...</p>}
      {blocks?.length === 0 && <p className="text-sm text-slate-400 text-center">ยังไม่มีข้อมูลกฎการใช้งาน</p>}
      <div className="flex flex-col gap-3">
        {blocks?.map((b) => (
          <div key={b.id} className="card p-4">
            {b.heading && <p className="font-bold mb-1.5">{b.heading}</p>}
            {b.imageUrl && <img src={b.imageUrl} alt="" className="rounded-xl w-full object-contain bg-slate-100 dark:bg-slate-800 mb-2" />}
            {b.body && <p className="text-sm whitespace-pre-line break-words text-slate-600 dark:text-slate-300">{b.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
