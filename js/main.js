if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'}).then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);

        registrationObj.pushManager.subscribe(
            {
                userVisibleOnly: true
            }
        ).then(function(subscriptionObj) {
            var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
            key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
            var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
            authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
            endpoint = subscription.endpoint;

            console.log("Endpoint: " + endpoint);
            console.log("Key: " + key);
            console.log("AuthSecret: " + authSecret);

            $("#endpoint-id").html(endpoint + " - KEY -" + key + " - AUTHSECRET - " + authSecret);
        });
    }).catch(function(error) {
        console.log('Error: ', error);
    });
}