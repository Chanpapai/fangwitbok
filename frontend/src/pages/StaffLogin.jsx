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
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && isStaff) return <Navigate to="/admin" replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(name.trim(), password);
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
        <input className="input" placeholder="ชื่อจริง" value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} autoComplete="username" />
        <div className="relative">
          <input className="input !pr-12" type={show ? "text" : "password"} placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={show}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-slate-500 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10">
            <Icon name={show ? "eyeoff" : "eye"} size={19} />
          </button>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-2.5">{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
      </form>
    </div>
  );
}
