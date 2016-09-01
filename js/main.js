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
                $(".loading-overlay").removeClass("hidden");
                $(".mdl-card").hide(); // hide all cards

                if (!subscription) {
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

                //navigator.serviceWorker.controller.postMessage("ready");
                navigator.serviceWorker.getNotifications({ tag : 'teamcast-push-notification' }).then(function(notifications) {
                    console.log(notifications);
                    // do something with your notifications
                })
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
                $(".loading-overlay").addClass("hidden");
            });

        navigator.serviceWorker.addEventListener('message', function(event) {
            //event.data.message
            var profileObj = JSON.parse(localStorage.getItem("profile"));
            $(".mdl-card").hide();
            $(".notification-card").show();
            $(".employee-name").html(profileObj.firstName + profileObj.lastName);
            $(".mdl-card__supporting-text", ".notification-card")
                .find("p").text(JSON.stringify(event.data.body));
        });

        $('#subscribe-btn').on('click', function(e) {
            e.preventDefault();
            $(".loading-overlay").removeClass("hidden");
            serviceWorkerRegistration.pushManager.subscribe(
                {
                    userVisibleOnly: true
                }
            ).then(function(subscription) {
                var subscriptionObj = JSON.parse(JSON.stringify(subscription));
                var profileObj = {
                    "firstName": $("#firstname").val(),
                    "lastName": $("#lastname").val(),
                    "registrationId": subscriptionObj.endpoint.split("https://android.googleapis.com/gcm/send/")[1],
                    "userPublicKey": subscriptionObj["keys"]["p256dh"],
                    "userAuthkey": subscriptionObj["keys"]["auth"]
                }

                //TODO: send subscripttion to REST API

                $(".mdl-card").hide(); // hide all cards
                $(".unsusbscribe-card").show();
                $("#endpoint-id").html(JSON.stringify(subscription));
                $(".loading-overlay").addClass("hidden");
                localStorage.setItem("profile", JSON.stringify(profileObj));
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
                    //TODO: send delete subscripttion to REST API

                    $(".mdl-card").hide(); // hide all cards
                    $(".subscription-card").show();
                    $("#endpoint-id").html("");
                    $(".loading-overlay").addClass("hidden");
                    localStorage.removeItem("profile");
                }).catch(function(e) {
                    // Unsubscribe failed
                    $(".loading-overlay").addClass("hidden");
                })
            });
        });
    });
}