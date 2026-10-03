import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";

const STATUS_TABS = [
  { key: "PENDING", label: "รอตรวจ" },
  { key: "REVIEWED", label: "ดำเนินการแล้ว" },
  { key: "DISMISSED", label: "ยกเลิก" },
];

export default function AdminReports() {
  const [status, setStatus] = useState("PENDING");
  const [reports, setReports] = useState([]);
  const [busyId, setBusyId] = useState(null);

  function load() { api.get(`/api/admin/reports?status=${status}`).then((d) => setReports(d.reports)); }
  useEffect(load, [status]);

  async function resolve(id, newStatus) {
    setBusyId(id);
    try { await api.post(`/api/admin/reports/${id}/resolve`, { status: newStatus }); load(); }
    catch (err) { alert(err.message); } finally { setBusyId(null); }
  }

  async function deletePost(postId) {
    if (!confirm("ลบโพสต์นี้ (ย้ายเข้า Trash) ใช่ไหม?")) return;
    try { await api.del(`/api/posts/${postId}`); load(); } catch (err) { alert(err.message); }
  }

  return (
    <div>
      <div className="flex gap-2 mb-3 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((t) => <button key={t.key} onClick={() => setStatus(t.key)} className={`chip ${status === t.key ? "chip-on" : "chip-off"}`}>{t.label}</button>)}
      </div>
      <div className="flex flex-col gap-3">
        {reports.map((r) => {
          const target = r.targetType === "POST" ? r.post : r.comment;
          return (
            <div key={r.id} className="card p-4">
              <p className="text-xs text-slate-400">รายงานโดยผู้เข้าชม · {timeAgo(r.createdAt)}</p>
              <p className="text-sm font-semibold mt-1">เหตุผล: {r.reason}</p>
              <div className="mt-2 bg-slate-100 dark:bg-white/[0.06] rounded-xl p-2.5 text-sm">
                <p className="text-xs text-slate-400 mb-0.5">
                  เนื้อหาที่ถูกรายงาน ({r.targetType === "POST" ? "โพสต์" : "คอมเมนต์"})
                  {target?.deletedAt && <span className="text-red-500 ml-1">— ถูกลบไปแล้ว</span>}
                </p>
                <p className="line-clamp-3 break-words">{target?.content || "(ไม่พบเนื้อหา)"}</p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {r.postId && <Link to={`/post/${r.postId}`} className="btn-ghost text-xs">เปิดดูโพสต์</Link>}
                {r.postId && !target?.deletedAt && status === "PENDING" && (
                  <button onClick={() => deletePost(r.postId)} className="btn-danger text-xs"><Icon name="trash" size={14} /> ลบโพสต์</button>
                )}
                {status === "PENDING" && (
                  <>
                    <button onClick={() => resolve(r.id, "REVIEWED")} disabled={busyId === r.id} className="btn-primary text-xs ml-auto"><Icon name="check" size={14} /> ดำเนินการแล้ว</button>
                    <button onClick={() => resolve(r.id, "DISMISSED")} disabled={busyId === r.id} className="btn-ghost text-xs">ยกเลิกรายงาน</button>
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
