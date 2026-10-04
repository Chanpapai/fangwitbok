import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";

const ICON = { NEW_POST: "megaphone", NEW_REPORT: "flag", SYSTEM: "bell", SUPPORT_MESSAGE: "headset" };

function StatCard({ to, icon, label, value, tone = "normal", hint }) {
  const tones = {
    normal: "text-brand-500 bg-brand-500/15",
    alert: "text-rose-600 dark:text-rose-300 bg-rose-500/15",
    ok: "text-emerald-600 dark:text-emerald-300 bg-emerald-500/15",
  };
  return (
    <Link to={to} className={`card-post p-4 block hover:-translate-y-0.5 transition ${tone === "alert" ? "!border-rose-400/70" : ""}`}>
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone]}`}><Icon name={icon} size={20} /></span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value ?? "–"}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{label}</p>
        </div>
      </div>
      {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">{hint}</p>}
    </Link>
  );
}

export default function AdminDashboard() {
  const { stats } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    api.get("/api/admin/notifications").then((d) => { setNotifications(d.notifications); setUnreadCount(d.unreadCount); }).catch(() => {});
  }
  useEffect(load, []);

  async function markRead(id) {
    await api.post(`/api/admin/notifications/${id}/read`);
    load();
  }

  const todo = (stats?.pendingReports || 0) + (stats?.supportUnread || 0);

  return (
    <div className="flex flex-col gap-4">
      {/* สถานะงานค้าง: เห็นทันทีว่าต้องทำอะไรก่อน */}
      <div className={`card-post p-4 flex items-center gap-3 ${todo > 0 ? "!border-rose-400/70" : ""}`}>
        <span className={`w-11 h-11 rounded-full flex items-center justify-center ${todo > 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"}`}>
          <Icon name={todo > 0 ? "bell" : "check"} size={22} />
        </span>
        <div className="min-w-0">
          {!stats ? <p className="font-semibold text-sm">กำลังโหลดสถานะ...</p> : todo > 0 ? (
            <>
              <p className="font-bold">มีงานรอดำเนินการ {todo} รายการ</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {stats.pendingReports > 0 && `รายงานรอตรวจ ${stats.pendingReports} `}
                {stats.supportUnread > 0 && `· ข้อความรอตอบ ${stats.supportUnread}`}
              </p>
            </>
          ) : (
            <>
              <p className="font-bold">ไม่มีงานค้าง</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">ไม่มีรายงานรอตรวจและไม่มีข้อความที่ยังไม่ได้ตอบ</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard to="/admin/reports" icon="flag" label="รายงานรอตรวจ" value={stats?.pendingReports} tone={stats?.pendingReports > 0 ? "alert" : "ok"} />
        <StatCard to="/admin/support" icon="headset" label="ข้อความรอตอบ" value={stats?.supportUnread} tone={stats?.supportUnread > 0 ? "alert" : "ok"} />
        <StatCard to="/admin/posts" icon="megaphone" label="โพสต์วันนี้" value={stats?.postsToday} hint={stats ? `ทั้งหมด ${stats.postsTotal} โพสต์` : undefined} />
        <StatCard to="/admin/popups" icon="layers" label="Popup ที่เปิดอยู่" value={stats?.activePopups} />
        <StatCard to="/admin/trash" icon="trash" label="โพสต์ในถังขยะ" value={stats?.trashPosts} hint="ลบถาวรอัตโนมัติเมื่อครบ 15 วัน" />
        <StatCard to="/admin/users" icon="users" label="สมาชิก Admin" value={stats?.staffCount} />
      </div>

      <div className="card-post p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="bell" size={18} />
          <p className="font-bold">การแจ้งเตือนล่าสุด</p>
          {unreadCount > 0 && <span className="badge bg-rose-500/15 text-rose-600 dark:text-rose-300">{unreadCount} ใหม่</span>}
        </div>
        <div className="flex flex-col gap-2">
          {notifications.map((n) => (
            <button key={n.id} onClick={() => !n.isRead && markRead(n.id)} className={`rounded-xl p-3 text-left flex gap-3 border ${!n.isRead ? "border-brand-400/70 bg-brand-500/10" : "border-slate-200 dark:border-white/10 opacity-80"}`}>
              <Icon name={ICON[n.type] || "bell"} size={18} className="mt-0.5 text-brand-500" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="block text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">{n.body}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-1">{timeAgo(n.createdAt)}</span>
              </span>
            </button>
          ))}
          {notifications.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-300 text-center py-4">ไม่มีการแจ้งเตือน</p>}
        </div>
      </div>
    </div>
  );
}
