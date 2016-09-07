importScripts("/cache-polyfill.js");

var pwaUrl = "https://teamcast.github.io",
staticCache = "teamcast-static-cache",
dataCache = "teamcast-data-cache",
client_id,
messageData,
filesToCache = [
    './',
	'/index.html',
	'/index.html?homescreen=1',
	'/?homescreen=1',
	'/images/logo.svg',
	'/images/logo-32x32.png',
	'/images/logo-72x72.png',
	'/images/logo-192x192.png',
	'/images/logo-512x512.png',
    '/images/team-jackd-logo.svg',
    '/images/asurion-logo-white.svg',
	'/css/style.css',
	'/css/material.min.css',
	'/js/jquery.min.js',
	'/js/main.js',
	'/js/material.min.js',
    '/js/mustache.min.js',
	'/fonts/material-icons.woff2'
];

self.addEventListener("install", function(event) {
  console.log("Event: Install");

  event.waitUntil(
	self.skipWaiting(),
    caches.open(staticCache)
    .then(function (cache) {
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
self.addEventListener("activate", function(event) {
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

self.addEventListener('fetch', function(event) {
  console.log('[ServiceWorker] Fetch', event.request.url);
  var dataUrl = 'https://teamcast-rest.herokuapp.com/rest/accounts';

  if (event.request.url === dataUrl) {
    event.respondWith(
        fetch(event.request)
            .then(function(response) {
              return caches.open(dataCache).then(function(cache) {
                cache.put(event.request.url, response.clone());

                console.log('[ServiceWorker] Fetched and Cached Data');

                return response;
              });
            })
    );
  } else {
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
  }

});

self.addEventListener('push', function(event) {
  console.log('Received push');

  let notificationTitle = 'This is the notif title';

  const notificationOptions = {
    body: 'This is the notif tray message',
    icon: './images/logo-192x192.png',
    badge: './images/logo-72x72.png',
    tag: 'teamcast-push-notification',
    vibrate: [300, 100, 400],
    data: {
      body: {
        heading: "",
        announcementId: "1",
        content: "",
        options: [],
        createTime: 1473153437414,
        imgUrl: ""
      }
    }
  };

  if (event.data) {
	console.log("GCM includes DATA!");

    var jsonPayload = JSON.parse(event.data.text());

    caches.open(dataCache).then(function(cache) {
      cache.matchAll('https://teamcast-rest.herokuapp.com/rest/accounts').then(function(response) {
        accountId = response[0].json().id;
        var apiUrl = "https://teamcast-rest.herokuapp.com/rest/announcements/"+jsonPayload.id+"/received/"+accountId;

        fetch(apiUrl, {
          method: 'put',
          headers: {
            "Content-type": "application/json"
          },
          body: {}
        })
            .then(function (data) {
              console.log('Successfully sent notification received status for announcement with ID: ' + jsonPayload.id);
            })
            .catch(function (error) {
              console.log('Sending notification received status failed: ', error);
            });
      });
    })

    notificationTitle = jsonPayload.title;
    notificationOptions.body = jsonPayload.message;
    notificationOptions.tag = notificationOptions.tag + jsonPayload.id;
    notificationOptions.data.body.heading = jsonPayload.message;
    notificationOptions.data.body.announcementId = jsonPayload.id;
    notificationOptions.data.body.content = jsonPayload.content;
    notificationOptions.data.body.options = jsonPayload.options;
    notificationOptions.data.body.createTime = jsonPayload.createTime;
    notificationOptions.data.body.imgUrl = jsonPayload.imgUrl;
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        notificationTitle, notificationOptions)
    ])
  );
});

self.addEventListener("notificationclick", function(event) {
  console.log("Notification is clicked ", event);

  messageData = event.notification.data;
  event.notification.close();

  //To open the app after click notification
  event.waitUntil(
    clients.matchAll({includeUncontrolled: true, type: 'window'})
    .then(function(clientList) {
		if (clientList.length > 0) {
			/*clientList[0].focus();
            clientList[0].postMessage(messageData);
            messageData = null;*/
            for(var x = 0; x < clientList.length; x++) {
              console.log(clientList[x].url)
              if(clientList[x].url.indexOf('teamcast.github.io') >= 0 ) {
                //clients.openWindow(clientList[x]);
                clientList[x].focus();
                clientList[x].postMessage(messageData);
                messageData = null;
              }
            }
		} else {
			self.clients.openWindow("/").then(function(client) {
              self.clients.claim();
              client_id = client.id;
            })
		}
        return
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data == "clientloaded" && messageData !== null) {
    self.clients.matchAll()
        .then(function(clientList) {
          clientList.forEach(function(client){
            //if (client.id == client_id) {
              client.postMessage(messageData);
              messageData = null;
            //}
          })
        })
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