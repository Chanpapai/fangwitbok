import { getVisitorId } from "./identity";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// access token เก็บในหน่วยความจำเท่านั้น (ไม่ใช้ localStorage) — ลดความเสี่ยงถ้ามีช่องโหว่ XSS หลุดมา
let accessToken = null;
let refreshingPromise = null;

function setAccessToken(token) {
  accessToken = token;
}

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function doRefresh() {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    credentials: "include", // แนบ cookie refreshToken/csrfToken
    headers: { "x-csrf-token": readCookie("csrfToken") || "" },
  });
  if (!res.ok) throw new Error("refresh failed");
  const data = await res.json();
  setAccessToken(data.accessToken);
  return data;
}

/** เรียกตอนเปิดแอปครั้งแรก เพื่อกู้เซสชันจาก refresh-token cookie แบบเงียบ ๆ */
async function bootstrapSession() {
  try {
    return await doRefresh();
  } catch {
    setAccessToken(null);
    return null;
  }
}

/**
 * fetch กลางของทั้งแอป:
 * - แนบ Authorization: Bearer อัตโนมัติ
 * - ถ้าเจอ 401 ครั้งแรก ลอง refresh เงียบ ๆ 1 ครั้งแล้วส่งคำขอซ้ำ (กันต้องให้ผู้ใช้ล็อกอินใหม่ทุก 15 นาที)
 * - body เป็น FormData (อัปโหลดรูป) จะไม่ตั้ง Content-Type เอง ปล่อยให้เบราว์เซอร์ใส่ boundary ให้
 */
async function apiFetch(path, { method = "GET", body, isForm = false, extraHeaders = {}, _retried = false } = {}) {
  const headers = { ...extraHeaders };
  if (!isForm) headers["Content-Type"] = "application/json";
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (!headers["x-visitor-id"]) headers["x-visitor-id"] = getVisitorId(); // ใช้กันกดใจซ้ำตอนไม่ได้ล็อกอิน
  if (path.startsWith("/api/auth/refresh") || path.startsWith("/api/auth/logout")) {
    headers["x-csrf-token"] = readCookie("csrfToken") || "";
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });

  if (res.status === 401 && !_retried && !path.startsWith("/api/auth/")) {
    if (!refreshingPromise) refreshingPromise = doRefresh().finally(() => (refreshingPromise = null));
    try {
      await refreshingPromise;
      return apiFetch(path, { method, body, isForm, _retried: true });
    } catch {
      // refresh ไม่สำเร็จจริง ๆ ปล่อยให้ error เดิมไหลต่อไป (ผู้เรียกจะจัดการนำทางไปหน้า login)
    }
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* ไม่มี body (เช่น 204) */
  }

  if (!res.ok) {
    const error = new Error(data?.error || `คำขอล้มเหลว (${res.status})`);
    error.status = res.status;
    error.details = data?.details;
    throw error;
  }
  return data;
}

export const api = {
  get: (path, extraHeaders) => apiFetch(path, { extraHeaders }),
  post: (path, body, extraHeaders) => apiFetch(path, { method: "POST", body, extraHeaders }),
  patch: (path, body, extraHeaders) => apiFetch(path, { method: "PATCH", body, extraHeaders }),
  del: (path, extraHeaders) => apiFetch(path, { method: "DELETE", extraHeaders }),
  postForm: (path, formData, extraHeaders) => apiFetch(path, { method: "POST", body: formData, isForm: true, extraHeaders }),
};

export { API_URL, setAccessToken, bootstrapSession };
