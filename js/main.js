if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'}).then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);

        registrationObj.pushManager.subscribe(
            {
                userVisibleOnly: true
            }
        ).then(function(subscriptionObj) {
            console.log('endpoint:', subscriptionObj.endpoint);
                console.log(JSON.parse(subscriptionObj))

            $("#endpoint-id").html(subscriptionObj.endpoint + " - KEY -" + JSON.parse(subscriptionObj.getKey("p256dh")));
        });
    }).catch(function(error) {
        console.log('Error: ', error);
    });
}