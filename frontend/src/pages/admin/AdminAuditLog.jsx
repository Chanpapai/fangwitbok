import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const ACTION_LABEL = {
  POST_DELETE: "ลบโพสต์",
  POST_RESTORE: "กู้คืนโพสต์",
  POST_PURGE: "ลบโพสต์ถาวร",
  POST_AUTO_PURGE: "ลบโพสต์ถาวร (อัตโนมัติ)",
  COMMENT_DELETE: "ลบคอมเมนต์",
  COMMENT_RESTORE: "กู้คืนคอมเมนต์",
  COMMENT_AUTO_PURGE: "ลบคอมเมนต์ถาวร (อัตโนมัติ)",
  REPORT_RESOLVE: "ตัดสินรายงาน",
  ROLE_CHANGE: "เปลี่ยนสิทธิ์ผู้ใช้",
  USER_BAN: "ระงับบัญชี",
  USER_UNBAN: "ปลดระงับบัญชี",
  POPUP_CREATE: "สร้าง Popup",
  POPUP_UPDATE: "แก้ไข Popup",
  POPUP_DELETE: "ลบ Popup",
};

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/api/admin/audit-logs").then((data) => setLogs(data.logs));
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => (
        <div key={log.id} className="card p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{ACTION_LABEL[log.action] || log.action}</p>
            <p className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString("th-TH")}</p>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            โดย {log.actor.displayName} ({log.actor.studentCode}, {log.actor.role}) · เป้าหมาย: {log.targetType} #{log.targetId.slice(0, 8)}
          </p>
          {log.metadata && (
            <pre className="text-[11px] bg-slate-100 dark:bg-slate-800 rounded-lg p-2 mt-1.5 overflow-x-auto">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          )}
        </div>
      ))}
      {logs.length === 0 && <p className="text-sm text-slate-400 text-center py-6">ยังไม่มีประวัติการกระทำ</p>}
    </div>
  );
}
