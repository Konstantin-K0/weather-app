// Replace v2 at its original URL, including while an old v2 tab is open.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const cache = `workbox-precache-v2-${self.registration.scope}`;
    await caches.delete(cache);
    await self.registration.unregister();
  })());
});
