/* Service Worker แบบเท่าที่จำเป็น: ให้ติดตั้งเป็นแอปได้ + เปิดเว็บเร็วขึ้น + ไม่ทำให้ข้อมูลเก่าค้าง
 * - /api/*  และคำขอที่ไม่ใช่ GET : ไม่แตะเลย (ผ่านเครือข่ายตรง) จึงไม่มีโพสต์/รูป/ข้อมูล Admin เก่าค้างในแคช
 * - /assets/* (ไฟล์ Vite ที่มี hash ในชื่อ) : cache-first (ไม่เปลี่ยนเนื้อหาตามชื่อ)
 * - หน้า (navigation) : network-first แล้วสำรองด้วย index.html ที่แคชไว้ ถ้าออฟไลน์
 * - รูปจาก Supabase Storage : ไม่แคชใน SW (เบราว์เซอร์แคชเองอยู่แล้ว 1 ปี) */
const VERSION = "fwb-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/", copy)); }
        return res;
      }).catch(() => caches.match("/").then((r) => r || Response.error()))
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/") || /\.(?:webp|png|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
