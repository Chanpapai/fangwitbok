import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [studentCode, setStudentCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(studentCode, password);
      navigate(location.state?.from?.pathname || "/staff", { replace: true });
    } catch (err) {
      setError(err.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="font-extrabold text-2xl text-center bg-gradient-to-r from-brand-400 to-brand-500 bg-clip-text text-transparent mb-6">
        🗣️ FangwitBok
      </h1>
      <form onSubmit={submit} className="card p-5 flex flex-col gap-3">
        <p className="font-bold text-lg text-center">เข้าสู่ระบบ</p>
        <input className="input" placeholder="รหัสนักเรียน" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} required />
        <input className="input" type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-2.5">{busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        <p className="text-center text-sm text-slate-500">
          
        </p>
      </form>
    </div>
  );
}
