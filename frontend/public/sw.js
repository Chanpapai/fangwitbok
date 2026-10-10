// Service Worker แบบเบา (จำเป็นสำหรับการติดตั้งเว็บเป็นแอป)
// - ไฟล์เว็บที่แฮชชื่อแล้ว (/assets/*) + ไอคอน/โลโก้: cache-first (โหลดซ้ำเร็ว ประหยัดดาต้า)
// - หน้าเว็บ (navigation): network-first ถ้าเน็ตหลุดใช้หน้าที่แคชไว้
// - /api/* และโดเมนอื่น (รูปจาก Supabase ฯลฯ): ไม่ยุ่งเลย ให้ข้อมูลสดเสมอ
const VERSION = "fwb-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add("/")).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(PAGES).then((c) => c.put("/", copy)); return res; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || /\.(png|webp|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
