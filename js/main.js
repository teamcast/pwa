if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');

    $(document).ready(function() {
        var controller = navigator.serviceWorker.controller;

        if (controller) {
           controller.postMessage("clientloaded");
        }
    });

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

                var profileObj = JSON.parse(localStorage.getItem("profile"));

                $(".employee-name").html(profileObj.firstName + " " + profileObj.lastName);
                $(".unsusbscribe-card").show();

                console.log(JSON.stringify(subscription));

                $("#endpoint-id").html(JSON.stringify(subscription));
                $(".loading-overlay").addClass("hidden");

                console.log(navigator.serviceWorker);
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
                $(".loading-overlay").addClass("hidden");
            });

        navigator.serviceWorker.addEventListener('message', function(event) {
            var messageObj = event.data.body;

            $(".mdl-card").hide();
            $(".notification-card").show();
            $(".mdl-card__supporting-text", ".notification-card")
                .find("p").text(messageObj.content);
            $(".options-container", ".notification-card").empty();

            if (messageObj.options && messageObj.options.length) {
                var optLen = messageObj.options.length;
                for (x=0; x < optLen; x++) {
                    var data = {
                        "id": messageObj.options[x].toLowerCase(),
                        "name": messageObj.options[x].toUpperCase()
                    }
                    var template = $("#options-template").html();
                    var optMarkup = Mustache.to_html(template, data);
                    var newRadio = $(optMarkup)[0];
                    componentHandler.upgradeElement(newRadio);

                    $(".options-container", ".notification-card").append(newRadio);
                }
            }

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
                $(".employee-name").html(profileObj.firstName + " " + profileObj.lastName);
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