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
                    $(".subscription-card").show();
                    $(".loading-overlay").addClass("hidden");
                    return;
                }

                var profileObj = JSON.parse(localStorage.getItem("profile"));

                $(".employee-name").html(profileObj.firstName.toLowerCase() + " " + profileObj.lastName.toLowerCase());
                $(".unsusbscribe-card, #unsubscribe-btn, #profile-btn").show();

                console.log(JSON.stringify(subscription));

                $("#registrationId").val(profileObj.registrationId);
                $("#userPublicKey").val(profileObj.publicKey);
                $("#userAuthkey").val(profileObj.auth);

                $(".loading-overlay").addClass("hidden");

                console.log(navigator.serviceWorker);
            })
            .catch(function(err) {
                console.log('Error during getSubscription()', err);
                $(".loading-overlay").addClass("hidden");
            });

        navigator.serviceWorker.addEventListener('message', function(event) {
            if (event && event.data) {
                var messageObj = event.data.body;
                var profileObj = JSON.parse(localStorage.getItem("profile"));

                $.ajax({
                    type: 'PUT',
                    url: "https://teamcast-rest.herokuapp.com/rest/announcements/"+messageObj.announcementId+"/seen/"+profileObj.accountId,
                    error: function(jqxhr, error, thrownError) {
                        console.log(jqxhr);
                        console.log(error);
                        console.log(thrownError);
                    }
                });

                $(".mdl-card").hide();
                $(".notification-card").removeClass("has-media");
                $(".mdl-card__title-text", ".notification-card").text(messageObj.heading);
                $(".mdl-card__title", ".notification-card").css({"background-image": "none"});
                $(".mdl-card__supporting-text", ".notification-card")
                    .find("p").text(messageObj.content);
                $(".options-container", ".notification-card").empty();

                if (messageObj.options && messageObj.options.length) {
                    var optLen = messageObj.options.length;
                    for (x=0; x < optLen; x++) {
                        var data = {
                            "id": messageObj.options[x],
                            "name": messageObj.options[x].toUpperCase()
                        }
                        var template = $("#options-template").html();
                        var optMarkup = Mustache.to_html(template, data);
                        var newRadio = $(optMarkup)[0];
                        componentHandler.upgradeElement(newRadio);

                        $(".options-container", ".notification-card").append(newRadio);
                    }
                    $("#respond-btn").data("announcementid", messageObj.announcementId);
                    $(".mdl-card__actions", ".notification-card").show();
                } else {
                    $(".mdl-card__actions", ".notification-card").hide();
                }

                if (messageObj.imgUrl != "") {
                    $(".notification-card").addClass("has-media")
                        .find(".mdl-card__title").css({"background-image": "url('"+messageObj.imgUrl+"')"});
                }

                $(".notification-card").show();
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
                        "firstName": $("#firstname").val().toUpperCase(),
                        "lastName": $("#lastname").val().toUpperCase(),
                        "registrationId": subscriptionObj.endpoint.split("https://android.googleapis.com/gcm/send/")[1],
                        "publicKey": subscriptionObj["keys"]["p256dh"],
                        "auth": subscriptionObj["keys"]["auth"]
                    }

                    $.ajax({
                        type: 'POST',
                        data: JSON.stringify(profileObj),
                        contentType: "application/json",
                        url: "https://teamcast-rest.herokuapp.com/rest/accounts",
                        success: function(resp) {
                            profileObj.accountId = resp.id;
                            localStorage.setItem("profile", JSON.stringify(profileObj));

                            $("#subscription-form")[0].reset();
                            $(".mdl-card").hide(); // hide all cards
                            $(".employee-name").html(profileObj.firstName.toLowerCase() + " " + profileObj.lastName.toLowerCase());
                            $(".unsusbscribe-card, #unsubscribe-btn, #profile-btn").show();
                            $("#registrationId").val(profileObj.registrationId);
                            $("#userPublicKey").val(profileObj.publicKey);
                            $("#userAuthkey").val(profileObj.auth);
                            $(".loading-overlay").addClass("hidden");
                        },
                        error: function(jqxhr, error, thrownError) {
                            console.log(jqxhr);
                            console.log(error);
                            console.log(thrownError);
                        }
                    });
                })
                .catch(function(err) {
                        console.log('Error during getSubscription()', err);
                        $(".loading-overlay").addClass("hidden");
                });
        });

        $('#unsubscribe-btn').on('click', function(e) {
            e.preventDefault();

            var layout = document.querySelector('.mdl-layout');
            layout.MaterialLayout.toggleDrawer();

            $(".loading-overlay").removeClass("hidden");

            serviceWorkerRegistration.pushManager.getSubscription()
                .then(function(subscription) {
                    subscription.unsubscribe().then(function(successful) {
                        var profileObj = JSON.parse(localStorage.getItem("profile"));

                        $.ajax({
                            type: 'DELETE',
                            data: JSON.stringify(profileObj),
                            url: "https://teamcast-rest.herokuapp.com/rest/accounts/" + profileObj.accountId,
                            complete: function() {
                                localStorage.removeItem("profile");

                                $(".mdl-card, #unsubscribe-btn, #profile-btn").hide(); // hide all cards
                                $(".subscription-card").show();
                                $(".loading-overlay").addClass("hidden");
                            },
                            error: function(jqxhr, error, thrownError) {
                                console.log(jqxhr);
                                console.log(error);
                                console.log(thrownError);
                            }
                        });
                    }).catch(function(e) {
                        // Unsubscribe failed
                        $(".loading-overlay").addClass("hidden");
                    })
            });
        });

        $('#notif-card-close-btn').on('click', function(e) {
            e.preventDefault();
            $(".notification-card").hide();
            $(".mdl-card__supporting-text", ".notification-card")
                .find("p").text("");
            $(".options-container", ".notification-card").empty();
            $(".unsusbscribe-card").show();
        });

        $("#respond-btn").on("click", function(e) {
            var profileObj = JSON.parse(localStorage.getItem("profile"));
            var responseObj = {
                "option": $("input[type='radio']", ".mdl-radio.is-checked").val()
            }

            $.ajax({
                type: 'POST',
                data: JSON.stringify(responseObj),
                contentType: "application/json",
                url: "https://teamcast-rest.herokuapp.com/rest/announcements/"+$(this).data("announcementid")+"/acknowledge/"+profileObj.accountId,
                beforeSend: function() {
                    $(".loading-overlay").removeClass("hidden");
                },
                success: function(resp) {
                    $(".notification-card").hide();
                    $(".mdl-card__supporting-text", ".notification-card")
                        .find("p").text("");
                    $(".options-container", ".notification-card").empty();
                    $(".unsusbscribe-card").show();
                },
                error: function(jqxhr, error, thrownError) {
                    console.log(jqxhr);
                    console.log(error);
                    console.log(thrownError);
                },
                complete: function() {
                    $(".loading-overlay").addClass("hidden");
                }
            });
        });
    });
}