/*
 * sw.js, service worker pro New Year Bundle PWA.
 *
 * Nejdřív síť, cache jako záloha. Nové verze se tak ukážou hned po pushnutí
 * a appka pořád jede i offline (třeba když v noci padne signál).
 */

const CACHE = "nyb-shell-v5";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/zones.js",
  "./js/time.js",
  "./js/i18n.js",
  "./js/facts.js",
  "./js/map.js",
  "./js/profiles.js",
  "./js/share.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
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
  const req = event.request;
  if (req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && (sameOrigin || req.url.includes("fonts."))) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
