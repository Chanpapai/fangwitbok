import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import { useSite } from "../context/SiteContext";

// หน้าเข้าสู่ระบบสำหรับทีมงาน (ไม่มีลิงก์ในเมนู) — ผู้ใช้ทั่วไปไม่ต้องใช้หน้านี้
export default function StaffLogin() {
  const { login, isStaff, loading } = useAuth();
  const { logoSm } = useSite();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && isStaff) return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(code, password);
      if (u.role === "USER") throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน");
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-10 max-w-sm mx-auto px-4 py-16">
      <img src={logoSm} alt="" className="h-16 w-auto mx-auto mb-6" />
      <form onSubmit={submit} className="card p-5 flex flex-col gap-3">
        <p className="font-bold text-lg text-center flex items-center justify-center gap-2"><Icon name="shield" size={20} /> เข้าสู่ระบบทีมงาน</p>
        <input className="input" placeholder="รหัสผู้ดูแล" value={code} onChange={(e) => setCode(e.target.value)} required autoComplete="username" />
        <input className="input" type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-2.5">{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
      </form>
    </div>
  );
}
