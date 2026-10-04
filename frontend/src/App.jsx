import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import PopupBanner from "./components/PopupBanner";
import FloatingLogo from "./components/FloatingLogo";
import IssueReportWidget from "./components/IssueReportWidget";
import { AdminRoute } from "./components/Guards";

import Home from "./pages/Home";
import Feed from "./pages/Feed";
import PostDetail from "./pages/PostDetail";
import CreatePost from "./pages/CreatePost";
import Rules from "./pages/Rules";
import Login from "./pages/Login";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports from "./pages/admin/AdminReports";
import AdminTrash from "./pages/admin/AdminTrash";
import AdminPopups from "./pages/admin/AdminPopups";
import AdminRules from "./pages/admin/AdminRules";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLog from "./pages/admin/AdminAuditLog";

export default function App() {
  const { loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">กำลังโหลด...</div>;

  return (
    <>
      <FloatingLogo />
      <div className="relative z-10">
        <Navbar />
        <PopupBanner />
        <IssueReportWidget />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/post/:id" element={<PostDetail />} />
          <Route path="/create" element={<CreatePost />} />
          <Route path="/rules" element={<Rules />} />
          {/* เส้นทางแอดมิน: ไม่ผูกไว้ใน Navigation สาธารณะ แต่ยังคงใช้ Authentication/RBAC จริงเป็นตัวป้องกัน ไม่ใช่ความลับของ URL */}
          <Route path="/staff/login" element={<Login />} />
          <Route element={<AdminRoute />}>
            <Route path="/staff" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="trash" element={<AdminTrash />} />
              <Route path="popups" element={<AdminPopups />} />
              <Route path="rules" element={<AdminRules />} />
              <Route path="support" element={<AdminSupport />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </>
  );
}
