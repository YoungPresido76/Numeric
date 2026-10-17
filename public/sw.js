/* Numeric service worker: caches the app shell so the game opens and runs offline. */
const CACHE = 'numeric-v1';
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const core = ['./', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
      await cache.addAll(core.map((path) => new URL(path, SCOPE).toString()));

      // Vite emits hashed files under assets/. Read them from index.html so the
      // very first visit is already fully available offline.
      try {
        const response = await fetch(new URL('./', SCOPE).toString(), { cache: 'reload' });
        const html = await response.text();
        const assets = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1])
          .filter((value) => value.includes('assets/'))
          .map((value) => new URL(value, SCOPE).toString());
        await cache.addAll(assets);
      } catch {
        // Offline during install or a missing asset: runtime caching below fills the gaps.
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request, { ignoreSearch: true });

      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => undefined);

      if (cached) {
        // Stale-while-revalidate: answer instantly, refresh in the background.
        event.waitUntil(network);
        return cached;
      }

      const fresh = await network;
      if (fresh) return fresh;
      if (request.mode === 'navigate') {
        const shell = await cache.match(new URL('./', SCOPE).toString());
        if (shell) return shell;
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })(),
  );
});
