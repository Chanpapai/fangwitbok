import { Suspense, lazy } from "react";
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
import Settings from "./pages/Settings";

// หลังบ้านโหลดแยกเมื่อเข้าใช้งานจริง — ผู้เข้าชมทั่วไปไม่ต้องดาวน์โหลดโค้ด Admin (เปิดเว็บเร็วขึ้น)
const AdminLayout = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminSupport = lazy(() => import("./pages/admin/AdminSupport"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminTrash = lazy(() => import("./pages/admin/AdminTrash"));
const AdminPopups = lazy(() => import("./pages/admin/AdminPopups"));
const AdminRules = lazy(() => import("./pages/admin/AdminRules"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog"));
const AdminPosts = lazy(() => import("./pages/admin/AdminPosts"));
const AdminImages = lazy(() => import("./pages/admin/AdminImages"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminContacts = lazy(() => import("./pages/admin/AdminContacts"));


export default function App() {
  const { pathname } = useLocation();
  const backstage = pathname.startsWith("/admin") || pathname.startsWith("/staff");

  return (
    <>
      <FloatingLogos />
      {!backstage && <Navbar />}
      {!backstage && <PopupBanner />}
      {!backstage && <SupportChat />}
      <Suspense fallback={<div className="relative z-10 max-w-xl mx-auto p-6"><div className="card p-4 skeleton h-32" /></div>}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/new" element={<Compose />} />
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/staff" element={<StaffLogin />} />
        <Route path="/settings" element={<Settings />} />

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
            <Route path="contacts" element={<AdminContacts />} />
            <Route path="rules" element={<AdminRules />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
      </Suspense>
    </>
  );
}
