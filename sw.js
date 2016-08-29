self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('teamcast').then(cache => {
      return cache.addAll([
        '/sw.js',
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
        '/js/jquery.min.js',
        '/js/main.js',
        '/js/material.min.js',
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

/*self.addEventListener('push', function(event) {
  console.log('Push message received', event);
  // TODO
});*/

self.addEventListener('push', function(event) {
  console.log('Received push');
  let notificationTitle = 'Hello';
  const notificationOptions = {
    body: 'Thanks for sending this push msg.',
    icon: './images/logo-192x192.png',
    badge: './images/logo-72x72.png',
    tag: 'simple-push-demo-notification',
    data: {
      url: 'https://developers.google.com/web/fundamentals/getting-started/push-notifications/'
    }
  };

  if (event.data) {
    const dataText = event.data.text();
    notificationTitle = 'Received Payload';
    notificationOptions.body = `Push data: '${dataText}'`;
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        notificationTitle, notificationOptions)
    ])
  );
});