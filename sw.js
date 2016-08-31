importScripts("/cache-polyfill.js");

var staticCache = "teamcast-static-cache";
var filesToCache = [
	'./',
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
];

self.addEventListener("install", event => {
  console.log("Event: Install");

  event.waitUntil(
	self.skipWaiting(),
    caches.open(staticCache)
    .then(function (cache) {
      //[] of files to cache & any of the file not present compelete 'addAll' will fail
      return cache.addAll(filesToCache.map(function (fileUrl) {
        return new Request(fileUrl);
      }))
      .then(function () {
        console.log("All the files are cached.");
      })
      .catch(function (error) {
        console.error("Failed to cache the files.", error);
      })
    })
  );
});

//Activate event to delete old caches
self.addEventListener("activate", event => {
  console.log("Event: Activate");

  var cacheWhitelist = ["teamcast-static-cache", "teamcast-data-cache"];

  //Delete unwanted caches
  event.waitUntil(
	self.clients.claim(),
    caches.keys()
      .then(function (allCaches) {
        allCaches.map(function (cacheName) {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        });
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the request.
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have 2 stream.
            var responseToCache = response.clone();

            caches.open(staticCache)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});


self.addEventListener('push', event => {
  console.log('Received push');

  let notificationTitle = 'Notification Title';

  const notificationOptions = {
    body: 'New Teamcast Notification',
    icon: './images/logo-192x192.png',
    badge: './images/logo-72x72.png',
    tag: 'teamcast-push-notification',
    vibrate: [300, 100, 400],
    data: {
      headline: "",
      message: "",
      messageId: "1",
      options: [
      	{
		  text: "no",
		  value: "unsafe",
		  priority: 2
		},
      	{
		  text: "yes",
		  value: "safe",
		  priority: 1
		}
      ],
      url: ""
    }
  };

  if (event.data) {
	console.log("GCM includes DATA!");
	console.log(event.data.text());

	const jsonPayload = JSON.parse(event.data.text());

    notificationTitle = jsonPayload.title;
    notificationOptions.body = jsonPayload.message;
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        notificationTitle, notificationOptions)
    ])
  );
});

self.addEventListener("notificationclick", event => {
  console.log("Notification is clicked ", event);

  event.notification.close();

  //To open the app after click notification
  event.waitUntil(
    clients.matchAll({
      type: "window"
    })
    .then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url == event.data.url && "focus" in client) {
          client.postMessage(event.notification);
          client.focus();
          return;
        }
      }
    })
  );
});