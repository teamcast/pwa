if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);
    }).catch(function(error) {
        console.log('Error: ', error);
    });

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        // Do we already have a push message subscription?
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                // Enable any UI which subscribes / unsubscribes from
                // push messages.
                //var pushButton = document.querySelector('.js-push-button');
                //pushButton.disabled = false;

                $(".mdl-card").hide();

                if (!subscription) {
                    // We aren’t subscribed to push, so set UI
                    // to allow the user to enable push
                    $(".subscription-card").show();
                    return;
                }

                // Keep your server in sync with the latest subscriptionId
                //sendSubscriptionToServer(subscription);

                //showCurlCommand(subscription);

                // Set your UI to show they have subscribed for
                // push messages
                //pushButton.textContent = 'Disable Push Messages';
                //isPushEnabled = true;

                $(".unsusbscribe-card").show();

                /*
                var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
                key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
                var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
                authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
                endpoint = subscription.endpoint;
                */

                console.log(JSON.stringify(subscription));

                $("#endpoint-id").html(JSON.stringify(subscription));
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
            });
    });

    document.querySelector('#subscribe-btn').addEventListener('click', function() {
        navigator.serviceWorker.ready.then(function(registrationObj) {
            registrationObj.pushManager.subscribe(
                {
                    userVisibleOnly: true
                }
            ).then(function(subscription) {
                    var rawKey = subscription.getKey ? subscription.getKey('p256dh') : '';
                    key = rawKey ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : '';
                    var rawAuthSecret = subscription.getKey ? subscription.getKey('auth') : '';
                    authSecret = rawAuthSecret ? btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : '';
                    endpoint = subscription.endpoint;

                    $("#endpoint-id").html(JSON.stringify(subscription));
                });
        });
    });
}