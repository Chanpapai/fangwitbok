import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [studentCode, setStudentCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(studentCode, password, displayName);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || "สมัครสมาชิกไม่สำเร็จ");
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
        <p className="font-bold text-lg text-center">สมัครสมาชิก</p>
        <input className="input" placeholder="รหัสนักเรียน" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} required />
        <input className="input" placeholder="ชื่อที่แสดง" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} />
        <input className="input" type="password" placeholder="รหัสผ่าน (อย่างน้อย 8 ตัว มีตัวเลข)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={busy} className="btn-primary w-full py-2.5">{busy ? "กำลังสมัคร..." : "สมัครสมาชิก"}</button>
        <p className="text-center text-sm text-slate-500">
          มีบัญชีแล้ว? <Link to="/login" className="text-brand-500 font-semibold">เข้าสู่ระบบ</Link>
        </p>
      </form>
    </div>
  );
}
