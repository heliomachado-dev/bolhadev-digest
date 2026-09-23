// Service Worker do BolhaDev Digest — vanilla (sem build/dependências).
// 1) Exibe Web Push recebido do backend  2) clique na notificação foca/abre o site
// 3) cache leve: estáticos cache-first, navegação network-first com fallback offline.

const CACHE = 'bolhadev-digest-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// --- Web Push ---
self.addEventListener('push', (event) => {
  const data = event.data
    ? event.data.json()
    : { title: 'BolhaDev Digest', body: 'Nova edição disponível!', icon: '/favicon.ico' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/favicon.ico',
      badge: '/favicon.ico',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
    })
  );
});

// --- Estratégia de cache PWA ---
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const isStatic = /\.(?:js|css|png|jpe?g|svg|ico|webp|woff2?)$/i.test(new URL(req.url).pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            return res;
          })
      )
    );
    return;
  }

  if (req.mode === 'navigate') {
    // Network-first: sempre tenta a edição fresca; cache só para offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
