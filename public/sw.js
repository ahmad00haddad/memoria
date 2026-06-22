// EliteCapture — Service Worker (PR4)
// الحد الأدنى الآمن لجعل التطبيق قابلاً للتثبيت (PWA) مع صفحة "بلا اتصال".
// متحفّظ عمداً: لا نخزّن استجابات الـ API/SSR حتى لا نكسر سلوك المنصة.
const CACHE = "elitecapture-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/app-icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // التنقّل بين الصفحات: الشبكة أولاً، ثم صفحة "بلا اتصال" عند الفشل.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())),
    );
  }
});
