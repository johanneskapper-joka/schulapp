// Schulapp – Service Worker (Offline-Grundgerüst; Push folgt in Phase 4)
const CACHE = 'schulapp-v3';   // bei jeder neuen Version hochzählen
const DATEIEN = ['./', './index.html', './app.js', './style.css', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;           // Daten immer live
  if (url.origin === location.origin) {                       // eigene Dateien: erst Netz, sonst Cache
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((res) => {
      const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {   // Bibliotheken & Schrift: Cache
    if (res.ok || res.type === 'opaque') { const kopie = res.clone(); caches.open(CACHE).then((c) => c.put(req, kopie)); }
    return res;
  })));
});
