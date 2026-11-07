/* CatchMyAction service worker: offline shell for static assets only.
 *
 * Caches build assets (/_next/static), icons and the manifest so the app opens without a signal.
 * When a page navigation fails because there is no network, shows the cached /offline page
 * instead of the browser's error screen.
 * Deliberately NOT cached: HTML pages (only /offline), /api/* (sessions, purchases, earnings are
 * personal and change), photos and previews (they are paid content and large), and any non-GET
 * request. Bump CACHE when this file changes, so old clients drop stale assets.
 */
const CACHE = "cma-static-v2";
const OFFLINE_URL = "/offline";
const STATIC = [
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
  "/icons/pwa-maskable-192.png",
  "/icons/pwa-maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([...STATIC, OFFLINE_URL])));
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

function isStaticAsset(url) {
  return url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || STATIC.includes(url.pathname));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Page navigations go to the network as usual. Only if that fails outright (no connection)
  // do we answer with the offline page. A server error (4xx, 5xx) is passed through untouched.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  const url = new URL(request.url);
  if (!isStaticAsset(url)) return; // everything else goes straight to the network

  // Build assets are content-hashed, so cache-first is safe.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
    )
  );
});
