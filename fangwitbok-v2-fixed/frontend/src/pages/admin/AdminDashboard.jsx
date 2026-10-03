import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { timeAgo } from "../../lib/format";
import Icon from "../../components/Icon";

const ICON = { NEW_POST: "megaphone", NEW_REPORT: "flag", POST_RESOLVED: "check", SYSTEM: "bell", SUPPORT_MESSAGE: "lifebuoy" };

export default function AdminDashboard() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    api.get("/api/admin/notifications").then((d) => { setNotifications(d.notifications); setUnreadCount(d.unreadCount); });
  }
  useEffect(load, []);

  async function markRead(id) {
    await api.post(`/api/admin/notifications/${id}/read`);
    load();
  }

  return (
    <div>
      <div className="card p-4 mb-3 flex items-center gap-2">
        <Icon name="bell" size={18} />
        <p className="font-bold">การแจ้งเตือน</p>
        {unreadCount > 0 && <span className="badge bg-rose-500/15 text-rose-500">{unreadCount} ใหม่</span>}
      </div>
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <button key={n.id} onClick={() => !n.isRead && markRead(n.id)} className={`card p-3 text-left flex gap-3 ${!n.isRead ? "!border-brand-400/60" : "opacity-75"}`}>
            <Icon name={ICON[n.type] || "bell"} size={18} className="mt-0.5 text-brand-500" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{n.title}</span>
              <span className="block text-xs text-slate-500 mt-0.5 break-words">{n.body}</span>
              <span className="block text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</span>
            </span>
          </button>
        ))}
        {notifications.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ไม่มีการแจ้งเตือน</p>}
      </div>
    </div>
  );
}
