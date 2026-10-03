import { getVoterKey } from "./guest";

// เว้นว่าง = same-origin (/api ผ่าน Vercel rewrite หรือ Vite proxy ตอน dev)
const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

// access token ของ Admin เก็บในหน่วยความจำเท่านั้น (ไม่ใช้ localStorage) — ลดผลกระทบถ้ามีช่องโหว่ XSS
let accessToken = null;
let refreshingPromise = null;

function setAccessToken(token) { accessToken = token; }

async function doRefresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "x-requested-with": "fwb" },
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json();
  setAccessToken(data.accessToken);
  return data;
}

async function bootstrapSession() {
  try { return await doRefresh(); } catch { setAccessToken(null); return null; }
}

async function apiFetch(path, { method = "GET", body, isForm = false, headers: extra = {}, as = "json", _retried = false } = {}) {
  const headers = { "x-requested-with": "fwb", "x-voter-key": getVoterKey(), ...extra };
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && !_retried && accessToken && !path.startsWith("/api/auth/")) {
    if (!refreshingPromise) refreshingPromise = doRefresh().finally(() => (refreshingPromise = null));
    try {
      await refreshingPromise;
      return apiFetch(path, { method, body, isForm, headers: extra, as, _retried: true });
    } catch { /* ปล่อย error เดิมไหลต่อ */ }
  }

  if (res.ok && as === "blob") return res.blob(); // ดาวน์โหลดไฟล์ (เช่น รูปจากหลังบ้าน)

  let data = null;
  try { data = await res.json(); } catch { /* ไม่มี body */ }

  if (!res.ok) {
    const error = new Error(data?.error || `คำขอล้มเหลว (${res.status})`);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (path, opts) => apiFetch(path, opts),
  post: (path, body, opts) => apiFetch(path, { method: "POST", body, ...opts }),
  patch: (path, body, opts) => apiFetch(path, { method: "PATCH", body, ...opts }),
  del: (path, opts) => apiFetch(path, { method: "DELETE", ...opts }),
  put: (path, body, opts) => apiFetch(path, { method: "PUT", body, ...opts }),
  blob: (path) => apiFetch(path, { as: "blob" }),
  postForm: (path, formData) => apiFetch(path, { method: "POST", body: formData, isForm: true }),
};

export { API_URL, setAccessToken, bootstrapSession };
