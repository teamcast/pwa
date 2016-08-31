if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);
    }).catch(function(error) {
        console.log('Error: ', error);
    });

    document.querySelector('#subscribe-btn').addEventListener('click', function() {
        navigator.serviceWorker.ready.then(function(registrationObj) {
            registrationObj.pushManager.subscribe(
                {
                    userVisibleOnly: true
                }
            ).then(function(subscriptionObj) {
                    var rawKey = subscriptionObj.getKey ? subscriptionObj.getKey('p256dh') : '';
                    key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
                    var rawAuthSecret = subscriptionObj.getKey ? subscriptionObj.getKey('auth') : '';
                    authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
                    endpoint = subscriptionObj.endpoint;

                    console.log("Endpoint: " + endpoint);
                    console.log("Key: " + key);
                    console.log("AuthSecret: " + authSecret);

                    $("#endpoint-id").html(endpoint + " - KEY -" + key + " - AUTHSECRET - " + authSecret);
                });
        });
    });
}