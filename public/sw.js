// Memoria Service Worker — PWA caching + offline support
// Version: 2.0 (Phase 5 — Performance)

const CACHE_NAME = "memoria-v2";
const OFFLINE_PAGE = "/offline.html";

// الملفات الأساسية التي تُحفظ دائماً في الـ cache (App Shell)
const APP_SHELL = [
  "/",
  "/offline.html",
  "/search",
  "/app",
  "/for-clients",
  "/for-photographers",
  "/guide",
  "/pricing",
];

// قواعد الـ caching
const CACHE_STRATEGIES = {
  // صور المعرض — Cache First (سريع + offline) مع تحديث في الخلفية
  images: /\.(jpg|jpeg|png|webp|gif|svg|ico)(\?.*)?$/i,
  // ملفات static — Cache First (لا تتغيّر كثيراً)
  static: /\.(css|js|woff|woff2|ttf|eot)(\?.*)?$/i,
  // API calls — Network First (بيانات حديثة مطلوبة)
  api: /\/(api|rest\/v1|auth\/v1)\//,
};

// ===== Install Event — تحميل App Shell =====
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Installing app shell...");
      // نستخدم addAll بشكل متساهل — لا نفشل إن لم تُوجد بعض الصفحات
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

// ===== Activate Event — حذف الـ caches القديمة =====
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ===== Fetch Event — استراتيجيات الـ caching =====
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير HTTP
  if (!request.url.startsWith("http")) return;

  // تجاهل Chrome extensions وغيرها
  if (url.protocol !== "https:" && url.hostname !== "localhost") return;

  // 1) API calls — Network First مع fallback للـ cache
  if (CACHE_STRATEGIES.api.test(request.url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 2) POST requests — دائماً Network (لا نُخزّن mutations)
  if (request.method !== "GET") return;

  // 3) الصور — Cache First مع تحديث في الخلفية (Stale While Revalidate)
  if (CACHE_STRATEGIES.images.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 4) ملفات static (JS, CSS) — Cache First
  if (CACHE_STRATEGIES.static.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5) صفحات HTML — Network First مع offline fallback
  event.respondWith(networkFirstWithOffline(request));
});

// ===== استراتيجية: Network First =====
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// ===== استراتيجية: Cache First =====
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

// ===== استراتيجية: Stale While Revalidate =====
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      const cache = caches.open(CACHE_NAME);
      cache.then((c) => c.put(request, response.clone()));
    }
    return response;
  }).catch(() => cached);

  return cached || fetchPromise;
}

// ===== استراتيجية: Network First + Offline Page =====
async function networkFirstWithOffline(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      // نُخزّن صفحات الـ HTML لمدة محدودة
      if (request.headers.get("accept")?.includes("text/html")) {
        cache.put(request, response.clone());
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Offline page كـ fallback أخير
    const offline = await caches.match(OFFLINE_PAGE);
    return offline || new Response("أنت غير متصل بالإنترنت", { status: 503 });
  }
}

// ===== Push Notifications (Phase 5 - تُفعَّل عند إعداد VAPID keys) =====
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const { title, body, icon, badge, url } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title || "Memoria", {
        body: body || "",
        icon: icon || "/app-icon-192.png",
        badge: badge || "/app-icon-192.png",
        dir: "rtl",
        lang: "ar",
        data: { url: url || "/" },
        actions: url ? [{ action: "open", title: "فتح" }] : [],
      })
    );
  } catch (e) {
    console.error("[SW] Push notification error:", e);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && "focus" in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});
