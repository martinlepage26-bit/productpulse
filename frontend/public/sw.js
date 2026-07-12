/* ProductPulse AI service worker: offline fallback + static caching */
const CACHE = "productpulse-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ("focus" in c) return c.focus();
      }
      return clients.openWindow("/alerts");
    })
  );
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([OFFLINE_URL, "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never intercept API calls or dev-server internals
  if (url.pathname.startsWith("/api")) return;
  if (
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/sockjs-node") ||
    url.pathname.startsWith("/ws")
  )
    return;

  // Navigation requests: network first, offline fallback
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Same-origin static assets: stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((resp) => {
            if (resp && resp.status === 200 && resp.type === "basic") {
              const clone = resp.clone();
              caches.open(CACHE).then((c) => c.put(request, clone));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
