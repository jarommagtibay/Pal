const CACHE_NAME = 'pal-v1';

// We just cache the shell for offline start, no aggressive caching for app logic 
// as this is a local P2P app that requires network anyway for signaling.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/src/main.js',
        '/src/style.css',
        '/vite.svg'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Ignore API and WS calls
  if (e.request.url.includes('/api/') || e.request.url.includes('/ws/')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
