const CACHE_NAME = 'crechenow-v3.0';
const STATIC_ASSETS = ['./', './index.html', './dashboard-parent.html', './dashboard-staff.html', './dashboard-teacher.html',
  './assets/css/main.css', './assets/css/components.css', './assets/js/core.js', './assets/js/storage.js', './assets/js/auth.js',
  './assets/js/notifications.js', './assets/js/app.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js'];

self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS))); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (e.request.mode === 'navigate') { e.respondWith(fetch(e.request).catch(() => caches.match('./index.html'))); return; }
  if (url.origin !== self.location.origin) { e.respondWith(fetch(e.request).catch(() => caches.match(e.request))); return; }
  e.respondWith((async () => { const cache = await caches.open(CACHE_NAME); const cached = await cache.match(e.request);
    const network = fetch(e.request).then(r => { if (r && r.status === 200) cache.put(e.request, r.clone()); return r; }).catch(() => cached);
    return cached || network; })());
});
self.addEventListener('push', e => { let d = { title: 'CrecheNow', body: 'Nova notificação' }; try { if (e.data) d = e.data.json(); } catch {}
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, icon: './assets/img/icons/icon-192x192.png' })); });
self.addEventListener('notificationclick', e => { e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => { for (const c of cs) if ('focus' in c) return c.focus(); if (self.clients.openWindow) return self.clients.openWindow('./'); })); });
