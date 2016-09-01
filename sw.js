importScripts("/cache-polyfill.js");

var pwaUrl = "https://teamcast.github.io";
var staticCache = "teamcast-static-cache";
var filesToCache = [
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
		var fetchRequest = event.request.clone();

		// Cache hit - return response
		if (response) {
			var onlineResponse = self.updateStaticCache(fetchRequest);

			return response;
		} else {
			return self.updateStaticCache(fetchRequest);
		}
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
      announcementId: "1",
      body: {
        content: "",
        options: []
      }
    }
  };

  if (event.data) {
	console.log("GCM includes DATA!");
	console.log(event.data.text());

	const jsonPayload = JSON.parse(event.data.text());

    notificationTitle = jsonPayload.headline;
    notificationOptions.body = jsonPayload.message;
    notificationOptions.data.announcementId = jsonPayload.announcementId;
    notificationOptions.data.body = jsonPayload.body;
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

  var messageData = event.notification.data;
  event.notification.close();

  //To open the app after click notification
  event.waitUntil(
    self.clients.matchAll()
    .then(function(clientList) {
		if (clientList.length > 0) {
			clientList[0].focus();
            clientList[0].postMessage(messageData);
		} else {
			self.clients.openWindow(pwaUrl).then(function(windowClient) {
              self.clients.claim();
              //windowClient.postMessage(messageData);
            }).then(function() {
              self.clients.matchAll()
                  .then(function(clientList) {
                    console.log(clientList);
                    //clientList[0].focus();
                    clientList[0].postMessage(messageData);
                  })
            })
		}
        return
    })
  );
});

self.addEventListener('message', function(event) {
  // Get all the connected clients and forward the message along.
  var promise = self.clients.matchAll()
      .then(function(clientList) {
        var senderID = event.source ? event.source.id : 'unknown';

        // We'll also print a warning, so users playing with the demo aren't confused.
        if (!event.source) {
          console.log('event.source is null; we don\'t know the sender of the ' +
          'message');
        }

        clientList.forEach(function(client) {
          // Skip sending the message to the client that sent it.
          if (client.id === senderID) {
            return;
          }
          client.postMessage({
            client: senderID,
            message: event.data
          });
        });
      });

  // If event.waitUntil is defined (not yet in Chrome because of the same issue detailed before),
  // use it to extend the lifetime of the Service Worker.
  if (event.waitUntil) {
    event.waitUntil(promise);
  }
});

self.updateStaticCache = function(request) {
	return fetch(request).then(
		function(response) {
			// Check if we received a valid response
			if(!response || response.status !== 200 || response.type !== 'basic') {
				return response;
			}

			var responseToCache = response.clone();

			caches.open(staticCache)
			.then(function(cache) {
				cache.put(request, responseToCache);
			});

			return response;
		}
	)
}