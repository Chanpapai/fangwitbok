import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import PopupBanner from "./components/PopupBanner";
import FloatingLogos from "./components/FloatingLogos";
import SupportChat from "./components/SupportChat";
import { AdminRoute } from "./components/Guards";

import Home from "./pages/Home";
import Feed from "./pages/Feed";
import PostDetail from "./pages/PostDetail";
import Compose from "./pages/Compose";
import Rules from "./pages/Rules";
import StaffLogin from "./pages/StaffLogin";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminReports from "./pages/admin/AdminReports";
import AdminTrash from "./pages/admin/AdminTrash";
import AdminPopups from "./pages/admin/AdminPopups";
import AdminRules from "./pages/admin/AdminRules";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAuditLog from "./pages/admin/AdminAuditLog";
import AdminPosts from "./pages/admin/AdminPosts";
import AdminImages from "./pages/admin/AdminImages";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  const { pathname } = useLocation();
  const backstage = pathname.startsWith("/admin") || pathname.startsWith("/staff");

  return (
    <>
      <FloatingLogos />
      {!backstage && <Navbar />}
      {!backstage && <PopupBanner />}
      {!backstage && <SupportChat />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/new" element={<Compose />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/staff" element={<StaffLogin />} />

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="posts" element={<AdminPosts />} />
            <Route path="images" element={<AdminImages />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="trash" element={<AdminTrash />} />
            <Route path="popups" element={<AdminPopups />} />
            <Route path="rules" element={<AdminRules />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
