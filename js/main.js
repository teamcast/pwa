if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);
    }).catch(function(error) {
        console.log('Error: ', error);
    });

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                $(".mdl-card").hide(); // hide all cards

                if (!subscription) {
                    // We aren’t subscribed to push, so set UI
                    // to allow the user to enable push
                    $(".subscription-card").show();
                    return;
                }

                $(".unsusbscribe-card").show();

                console.log(JSON.stringify(subscription));

                $("#endpoint-id").html(JSON.stringify(subscription));
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
            });

        $('#subscribe-btn').on('click', function(e) {
            e.preventDefault();
            serviceWorkerRegistration.pushManager.subscribe(
                {
                    userVisibleOnly: true
                }
            ).then(function(subscription) {
                    //TODO: send subscripttion to REST API

                    $(".mdl-card").hide(); // hide all cards
                    $(".unsusbscribe-card").show();
                    $("#endpoint-id").html(JSON.stringify(subscription));
                });
        });
        $('#unsubscribe-btn').on('click', function(e) {
            e.preventDefault();

            serviceWorkerRegistration.pushManager.getSubscription()
                .then(function(subscription) {
                    subscription.unsubscribe().then(function(successful) {
                    //TODO: send subscripttion to REST API

                    $(".mdl-card").hide(); // hide all cards
                    $(".subscription-card").show();
                    $("#endpoint-id").html("");
                }).catch(function(e) {
                    // Unsubscription failed
                })
            });
        });
    });


}