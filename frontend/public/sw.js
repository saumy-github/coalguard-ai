// CoalGuard AI service worker — hand-written (no Workbox/vite-plugin-pwa),
// see research/location-and-pwa-notes-7-sep.md's "not currently a configured
// PWA" note. Provides an installable app shell + best-effort offline
// resilience on top of what's already there:
//   - The Worker issue-report offline queue (src/utils/db.ts +
//     src/hooks/useSyncManager.ts) already handles queuing/retrying API
//     writes while offline — this worker does NOT duplicate that. It never
//     intercepts requests to the backend API (a different origin than the
//     frontend in every real deployment), so those calls behave exactly as
//     they did before this file existed.
//   - What this worker adds is caching the app shell itself (HTML/JS/CSS/
//     images/fonts) so the site still loads — and previously-visited routes
//     still render — when there's no network at all, not just when a tab
//     that was already open loses connectivity mid-session.
//
// Bump CACHE_VERSION whenever this file's caching behavior changes; it's
// the only "cache bust" mechanism here since there's no build-time asset
// manifest to diff against (no bundler plugin is generating one).
const CACHE_VERSION = 'v1';
const CACHE_NAME = `coalguard-shell-${CACHE_VERSION}`;

// Requests worth precaching at install time — small, stable, same-origin
// assets we know the exact URL of without reading Vite's build output.
// The hashed JS/CSS bundle is deliberately NOT listed here (its filename
// isn't known at write-time); it gets cached at runtime instead, below.
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only ever handle same-origin GETs. This is what keeps the backend API
  // (a different origin — see frontend/src/utils/api.ts's VITE_API_URL)
  // and any POST/PUT/etc. (issue reports, auth, attendance...) completely
  // untouched: they fall through to the network exactly as if this worker
  // didn't exist, so the existing IndexedDB offline queue stays the only
  // thing responsible for API-write resilience.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Navigations (typing a URL, refreshing, opening the installed app) —
  // network-first so users always get the latest shell when online, with
  // the cached shell as an offline fallback. Since this is a client-routed
  // SPA (react-router's BrowserRouter — see src/App.tsx), the *same* cached
  // '/' document is the correct fallback for every path: the app's own JS
  // reads location and renders the right route once it boots.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Everything else same-origin (hashed JS/CSS chunks, images, webfonts,
  // icons): stale-while-revalidate. Serve from cache immediately when
  // present for speed and offline availability, and always refresh the
  // cache in the background from the network so the next load — online —
  // gets the newest version.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
