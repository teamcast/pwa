importScripts("/cache-polyfill.js");

var teamcastIDB,
    staticCache = "teamcast-static-cache",
    dataImageCache = "teamcast-data-cache",
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

var openDBRequest = indexedDB.open("teamcastIDB", 1);

openDBRequest.onupgradeneeded = function(e) {
  var thisDB = e.target.result;
  if (!thisDB.objectStoreNames.contains("users")) {
    thisDB.createObjectStore("users", {
      autoIncrement: true
    });
    thisDB.createObjectStore("notifications", {
      autoIncrement: true
    });
  }
}
openDBRequest.onsuccess = function(e) {
  teamcastIDB = e.target.result;
}
openDBRequest.onerror = function(e) {
  console.log("Error opening IndexedDB");
}

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

  var cacheWhitelist = ["teamcast-static-cache", "teamcast-data-cache"];

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

  if (event.request.url === accountsUrl) {
    console.log("FETCH REQUEST FOR ACCOUNTS URL - ", event.request.url);

    if (teamcastIDB.objectStoreNames.contains("users")) {
      var transaction = teamcastIDB.transaction("users", "readwrite");
      var store = transaction.objectStore("users");
      var deleteRequest = store.delete("accountId");
      deleteRequest.onerror = function() {
        console.log("Error deleting accountId from IndexedDB");
      }
      deleteRequest.onsuccess = function() {
        console.log("Successfully deleted accountId from IndexedDB");
      }
    }

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
              var clonedResponse = response.clone();

              clonedResponse.json().then(function(json) {
                var accountId = json.id;
                var transaction = teamcastIDB.transaction("users", "readwrite");
                var store = transaction.objectStore("users");
                var addRequest = store.add(accountId, "accountId");

                addRequest.onerror = function() {
                  console.log("Error saving accountId to IndexedDB");

                }
                addRequest.onsuccess = function() {
                  console.log("accountId saved to IndexedDB");
                }
              });

              return response;
            })
    );
  } else if (event.request.url.indexOf(imagesUrl) == 0) {
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
    //console.log("FETCH REQUEST FOR OTHER URL - ", event.request.url);
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

  var notificationTitle = 'This is the notif title';
  var notificationOptions = {
    body: 'This is the notif tray message',
    icon: './images/logo-192x192.png',
    badge: './images/logo-72x72.png',
    tag: 'teamcast-push-notification',
    vibrate: [300, 100, 300, 100, 300],
    data: {
      body: {
        heading: "",
        trayMessage: "",
        announcementId: "0",
        createTime: 0,
        content: "",
        options: [],
        imgId: "",
        received: 1,
        seen: 0,
        response: ""
      }
    }
  };

  if (event.data) {
    var jsonPayload = JSON.parse(event.data.text());
    var transaction = teamcastIDB.transaction("users", "readwrite");
    var store = transaction.objectStore("users");

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

    var request = store.get("accountId");

    request.onerror = function(e) {
      console.log("Error getting accountId from IndexedDB");
    }
    request.onsuccess = function(e) {
      var accountId = request.result;
      console.log("accountId from IndexedDB :", accountId);

      var apiUrl = restBaseUrl +"announcements/" + jsonPayload.id + "/received/" + accountId;
      fetch(apiUrl, {
        method: 'PUT',
        headers: {
          "Content-type": "application/json"
        },
        body: {}
      })
          .then(function(data) {
            console.log('Successfully sent notification received status for announcement with ID: ' + jsonPayload.id);
          })
          .catch(function(error) {
            console.log('Sending notification received status failed: ', error);
          });
    }

    notificationTitle = jsonPayload.title;
    notificationOptions.body = jsonPayload.message;
    notificationOptions.tag = notificationOptions.tag + jsonPayload.id;

    notificationOptions.data.body.announcementId = jsonPayload.id;
    notificationOptions.data.body.createTime = jsonPayload.createTime;
    notificationOptions.data.body.heading = jsonPayload.title;
    notificationOptions.data.body.trayMessage = jsonPayload.message;
    notificationOptions.data.body.content = jsonPayload.content;
    notificationOptions.data.body.imgId = jsonPayload.imgId;
    notificationOptions.data.body.options = jsonPayload.options;

    var transaction = teamcastIDB.transaction("notifications", "readwrite");
    var store = transaction.objectStore("notifications");
    var addRequest = store.add(notificationOptions.data.body, jsonPayload.id);

    addRequest.onerror = function() {
      console.log("Error saving notification to IndexedDB");

    }
    addRequest.onsuccess = function() {
      console.log("Notification saved to IndexedDB");
    }
  }

  event.waitUntil(
      Promise.all([
        self.registration.showNotification(
            notificationTitle, notificationOptions)
      ])
  );
});

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
                  clientList[x].focus();
                  clientList[x].postMessage(messageData);
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
  return fetch(request).then(
      function(response) {
        // Check if we received a valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        var responseToCache = response.clone();

        caches.open(cacheName)
            .then(function(cache) {
              cache.put(request, responseToCache);
            });

        return response;
      }
  )
}