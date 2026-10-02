import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const STATUS_TABS = [
  { key: "PENDING", label: "รอตรวจ" },
  { key: "REVIEWED", label: "ดำเนินการแล้ว" },
  { key: "DISMISSED", label: "ยกเลิก" },
];

export default function AdminReports() {
  const [status, setStatus] = useState("PENDING");
  const [reports, setReports] = useState([]);
  const [busyId, setBusyId] = useState(null);

  function load() {
    api.get(`/api/admin/reports?status=${status}`).then((data) => setReports(data.reports));
  }
  useEffect(load, [status]);

  async function resolve(id, newStatus) {
    setBusyId(id);
    try {
      await api.post(`/api/admin/reports/${id}/resolve`, { status: newStatus });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${status === t.key ? "bg-gradient-to-r from-brand-400 to-brand-500 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {reports.map((r) => {
          const target = r.targetType === "POST" ? r.post : r.comment;
          return (
            <div key={r.id} className="card p-4">
              <p className="text-xs text-slate-400">
                รายงานโดย {r.reporter.displayName} ({r.reporter.studentCode})
              </p>
              <p className="text-sm font-semibold mt-1">เหตุผล: {r.reason}</p>
              <div className="mt-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-2.5 text-sm">
                <p className="text-xs text-slate-400 mb-0.5">
                  เนื้อหาที่ถูกรายงาน ({r.targetType === "POST" ? "โพสต์" : "คอมเมนต์"})
                  {target?.deletedAt && <span className="text-red-500 ml-1">— ถูกลบไปแล้ว</span>}
                </p>
                <p className="line-clamp-3 break-words">{target?.content || "(ไม่พบเนื้อหา)"}</p>
              </div>
              <div className="flex gap-2 mt-3">
                {r.targetType === "POST" && r.postId && (
                  <Link to={`/post/${r.postId}`} className="btn-ghost text-xs">เปิดดูโพสต์</Link>
                )}
                {status === "PENDING" && (
                  <>
                    <button onClick={() => resolve(r.id, "REVIEWED")} disabled={busyId === r.id} className="btn-primary text-xs ml-auto">
                      ✅ ดำเนินการแล้ว
                    </button>
                    <button onClick={() => resolve(r.id, "DISMISSED")} disabled={busyId === r.id} className="btn-ghost text-xs">
                      ยกเลิกรายงาน
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {reports.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ไม่มีรายงานในหมวดนี้</p>}
      </div>
    </div>
  );
}
