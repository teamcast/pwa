var openDBRequest,
    teamcastIDB,
    staticCache = "teamcast-static-cache",
    dataImageCache = "teamcast-data-cache",
    accountCache = "teamcast-account-cache",
    restBaseUrl = "https://teamcast-rest.herokuapp.com/rest/",
    messageData,
    filesToCache = [
      '/index.html',
      '/index.html?homescreen=1',
      '/?homescreen=1',
      '/?utm_source=web_app_manifest',
      '/images/logo.svg',
      '/images/logo-32x32.png',
      '/images/logo-72x72.png',
      '/images/logo-192x192.png',
      '/images/logo-512x512.png',
      '/images/team-jackd-logo.svg',
      '/images/asurion-logo-white.svg',
      '/images/about-img.gif',
      '/images/teamcast-icon.png',
      '/images/testimonial-bg.jpg',
      '/css/style.css',
      '/css/material.min.css',
      '/js/jquery.min.js',
      '/js/lodash.min.js',
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
          .then(function(cache) {
            return cache.addAll(filesToCache.map(function(fileUrl) {
              return new Request(fileUrl);
            }))
                .then(function() {
                  console.log("All the static files are cached.");
                })
                .catch(function(error) {
                  console.error("Failed to cache the static files.", error);
                })
          })
  );
});

//Activate event to delete old caches
self.addEventListener("activate", function(event) {
  console.log("Event: Activate");

  openDBRequest = indexedDB.open("teamcastIDB", 1);
  openDBRequest.onsuccess = function(e) {
    teamcastIDB = e.target.result;
    console.log("FROM SW - Successfully opened IndexedDB");
  }
  openDBRequest.onerror = function(e) {
    console.log("FROM SW - Error opening IndexedDB");
  }

  var cacheWhitelist = ["teamcast-static-cache", "teamcast-data-cache", "teamcast-account-cache"];

  //Delete unwanted caches
  event.waitUntil(
      self.clients.claim(),
      caches.keys()
          .then(function(allCaches) {
            allCaches.map(function(cacheName) {
              if (cacheWhitelist.indexOf(cacheName) === -1) {
                return caches.delete(cacheName);
              }
            });
          })
  );
});

self.addEventListener('fetch', function(event) {
  console.log('Event: Fetch', event.request.url);

  var accountsUrl = restBaseUrl + "accounts";
  var imagesUrl = restBaseUrl + "images";

  if (event.request.url.indexOf(imagesUrl) == 0) {
    console.log("FETCH REQUEST FOR IMAGES URL - ", event.request.url);
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
              var fetchRequest = event.request.clone();

              // Cache hit - return response
              if (response) {
                var onlineResponse = self.updateStorageCache(fetchRequest, dataImageCache);

                return response;
              } else {
                return self.updateStorageCache(fetchRequest, dataImageCache);
              }
            })
    );
  } else {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
              var fetchRequest = event.request.clone();

              // Cache hit - return response
              if (response) {
                var onlineResponse = self.updateStorageCache(fetchRequest, staticCache);

                return response;
              } else {
                return self.updateStorageCache(fetchRequest, staticCache);
              }
            })
    );
  }

});

self.addEventListener('push', function(event) {
  console.log('Event: Push');

  var jsonPayload = JSON.parse(event.data.text());
  var notificationTitle = jsonPayload.title;
  var notificationOptions = {
    body: jsonPayload.message,
    icon: './images/logo-192x192.png',
    badge: './images/logo-72x72.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'teamcast-push-notification' + jsonPayload.id,
    data: {
      body: {
        heading: jsonPayload.title,
        trayMessage: jsonPayload.message,
        announcementId: jsonPayload.id,
        createTime: jsonPayload.createTime,
        content: jsonPayload.content,
        options: jsonPayload.options,
        imgId: jsonPayload.imgId,
        received: 1,
        seen: 0,
        response: ""
      }
    }
  };

  event.waitUntil(
      Promise.all([
        self.registration.showNotification(
            notificationTitle, notificationOptions)
      ])
  );

  if (jsonPayload.imgId && jsonPayload.imgId.length) {
    var imagesUrl = restBaseUrl + "images/" + jsonPayload.imgId;

    fetch(imagesUrl, {
      method: 'GET'
    })
        .then(function(data) {
          console.log('Successfully requested image in notification content');
        })
        .catch(function(error) {
          console.log('Failed requesting image in notification content: ', error);
        });
  }

  self.sendReceivedNotificationStatus(jsonPayload.id);
});

self.sendReceivedNotificationStatus = function(announcementId) {
  caches.match(new URL(restBaseUrl + "accounts"))
      .then(function(response) {
        return response.text().then(function(text) {
          console.log("ACCOUNT ID: ", text);
          var apiUrl = restBaseUrl +"announcements/" + announcementId + "/received/" + text;
          fetch(apiUrl, {
            method: 'PUT',
            headers: {
              "Content-type": "application/json"
            },
            body: {}
          })
              .then(function(data) {
                console.log('Successfully sent notification received status for announcement with ID: ' + announcementId);
              })
              .catch(function(error) {
                console.log('Sending notification received status failed: ', error);
              });
        })
      })
}

self.addEventListener("notificationclick", function(event) {
  console.log("Event: NotificationClick", event);

  messageData = event.notification.data;
  event.notification.close();

  //To open the app after click notification
  event.waitUntil(
      clients.matchAll({
        includeUncontrolled: true,
        type: 'window'
      })
          .then(function(clientList) {
            if (clientList.length > 0) {
              for (var x = 0; x < clientList.length; x++) {
                console.log("CLIENT URL: ", clientList[x].url);

                if (clientList[x].url.indexOf('teamcast.github.io') >= 0) {
                  try {
                      console.log("MESSAGE DATA", messageData);
                    clientList[x].focus();
                    clientList[x].postMessage(messageData);
                  } catch(err) {
                    console.log("ERROR FOCUSING ON CLIENT: ", clientList[x].url);
                  }

                }
              }
              messageData = null;
            } else {
              self.clients.openWindow("./?utm_source=web_app_manifest").then(function(client) {
                self.clients.claim();
              })
            }
            return
          })
  );
});

self.addEventListener('message', function(event) {
  console.log("Event: PostMessage", event);
  if (event.data == "clientloaded" && messageData !== null) {
      console.log(messageData);
    self.clients.matchAll()
        .then(function(clientList) {
          clientList.forEach(function(client) {
            client.postMessage(messageData);
          })
          messageData = null;
        })
  }
});

self.updateStorageCache = function(request, cacheName) {
  console.log("updateStorageCache called for: ", cacheName);
  var requestURL = new URL(request.url);

  return fetch(request).then(
      function(response) {
        // Check if we received a valid response
        if (!response) {
          return response;
        } else {
          if (response.type === "basic" && response.status === 200) {
            console.log("CACHING TEAMCAST STATIC FILES");
          } else if (response.type === "opaque" && requestURL.hostname.indexOf("teamcast") > -1) {
            console.log("CACHING IMAGE FROM teamcast-rest.herokuapp.com")
          } else {
            return response;
          }
        }

        var responseToCache = response.clone();

        caches.open(cacheName)
            .then(function(cache) {
              console.log("CACHENAME: ", cacheName);
              cache.put(request, responseToCache);
            });

        return response;
      }
  )
}