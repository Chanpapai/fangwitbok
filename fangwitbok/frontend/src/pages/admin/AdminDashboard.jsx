import { useEffect, useState } from "react";
import { api } from "../../lib/api";

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "เมื่อสักครู่";
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชั่วโมงที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH");
}

const ICON = { NEW_POST: "📝", NEW_REPORT: "🚩", POST_RESOLVED: "✅", SYSTEM: "ℹ️" };

export default function AdminDashboard() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  function load() {
    api.get("/api/admin/notifications").then((data) => {
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  }
  useEffect(load, []);

  async function markRead(id) {
    await api.post(`/api/admin/notifications/${id}/read`);
    load();
  }

  return (
    <div>
      <div className="card p-4 mb-3">
        <p className="font-bold">🔔 การแจ้งเตือน {unreadCount > 0 && <span className="badge bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300 ml-1">{unreadCount} ใหม่</span>}</p>
      </div>
      <div className="flex flex-col gap-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            className={`card p-3 text-left ${!n.isRead ? "border-brand-400" : ""}`}
          >
            <p className="text-sm font-semibold">{ICON[n.type] || "🔔"} {n.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
            <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
          </button>
        ))}
        {notifications.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ไม่มีการแจ้งเตือน</p>}
      </div>
    </div>
  );
}
