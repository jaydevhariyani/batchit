self.addEventListener('install', (e) => {
    console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
    // આનાથી એપ ફાસ્ટ લોડ થશે
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
