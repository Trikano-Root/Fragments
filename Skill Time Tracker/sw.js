// Tracker.io service worker
// Caches the app shell so it opens instantly and works even with a flaky connection.
// Data itself still comes from Supabase over the network - this just caches the app files.

const CACHE_NAME = "tracker-io-v1";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./Icons/icon-128.png",
  "./Icons/icon-256.png",
  "./Icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls - always go to the network for your data.
  if (url.hostname.includes("supabase.co")) {
    return;
  }

  // For app shell files: try cache first, fall back to network.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          // Cache a copy of newly fetched app files (same-origin only)
          if (url.origin === self.location.origin && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      );
    })
  );
});