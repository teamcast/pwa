if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .then(function(registrationObj) {
        console.log('sw.js registered. ', registrationObj);
            alert("REGISTERED");
    }).catch(function(error) {
            alert("ERROR");
        console.log('Error: ', error);
    });

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        alert("READY");
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                alert("GETSUBSCRIPTION");
                $(".loading-overlay").removeClass("hidden");
                $(".mdl-card").hide(); // hide all cards

                if (!subscription) {
                    alert("NOSUBSCRIPTION");
                    // We aren’t subscribed to push, so set UI
                    // to allow the user to enable push
                    $(".subscription-card").show();
                    $(".loading-overlay").addClass("hidden");
                    return;
                }

                $(".unsusbscribe-card").show();

                console.log(JSON.stringify(subscription));

                $("#endpoint-id").html(JSON.stringify(subscription));
                $(".loading-overlay").addClass("hidden");
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
                alert("ERRORGETSUBSCRIPTION");
                $(".loading-overlay").addClass("hidden");
            });

        $('#subscribe-btn').on('click', function(e) {
            e.preventDefault();
            $(".loading-overlay").removeClass("hidden");
            serviceWorkerRegistration.pushManager.subscribe(
                {
                    userVisibleOnly: true
                }
            ).then(function(subscription) {
                //TODO: send subscripttion to REST API

                $(".mdl-card").hide(); // hide all cards
                $(".unsusbscribe-card").show();
                $("#endpoint-id").html(JSON.stringify(subscription));
                $(".loading-overlay").addClass("hidden");
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
                $(".loading-overlay").addClass("hidden");
            });
        });
        $('#unsubscribe-btn').on('click', function(e) {
            e.preventDefault();
            $(".loading-overlay").removeClass("hidden");

            serviceWorkerRegistration.pushManager.getSubscription()
                .then(function(subscription) {
                    subscription.unsubscribe().then(function(successful) {
                    //TODO: send subscripttion to REST API

                    $(".mdl-card").hide(); // hide all cards
                    $(".subscription-card").show();
                    $("#endpoint-id").html("");
                    $(".loading-overlay").addClass("hidden");
                }).catch(function(e) {
                    // Unsubscription failed
                    $(".loading-overlay").addClass("hidden");
                })
            });
        });
    });


}