self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('teamcast').then(cache => {
      return cache.addAll([
        '/',
        '/index.html',
        '/index.html?homescreen=1',
        '/?homescreen=1',
        '/images/logo.svg',
        '/images/logo-32x32.png',
        '/images/logo-72x72.png',
        '/images/logo-192x192.png',
        '/images/logo-512x512.png',
        '/css/style.css',
        '/css/material.min.css',
        '/scripts/material.min.js',
        '/fonts/material-icons.woff2'
      ])
      .then(() => self.skipWaiting());
    })
  )
});

self.addEventListener('activate',  event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});