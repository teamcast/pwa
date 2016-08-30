if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('sw.js').then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);

        registrationObj.pushManager.subscribe(
            {
                userVisibleOnly: true
            }
        ).then(function(subscriptionObj) {
            console.log('endpoint:', subscriptionObj.endpoint);

            $("#endpoint-id").html(subscriptionObj.endpoint);
        });
    }).catch(function(error) {
        console.log('Error: ', error);
    });
}