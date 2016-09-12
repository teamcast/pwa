if (('serviceWorker' in navigator) && ('PushManager' in window)) {
    console.log('Service Worker is supported');

    var restBaseUrl = "https://teamcast-rest.herokuapp.com/rest/";

    $(".teamcast-pwa.mdl-layout").removeClass("invisible");
    $(document).ready(function() {
        var controller = navigator.serviceWorker.controller;

        if (controller) {
            controller.postMessage("clientloaded");
        }
    });

    navigator.serviceWorker.register('/sw.js', {
        scope: '/'
    })
        .then(function(registrationObj) {
            console.log('sw.js registered. ', registrationObj);
        }).catch(function(error) {
            console.log('Error: ', error);
        });

    navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
        serviceWorkerRegistration.pushManager.getSubscription()
            .then(function(subscription) {
                $(".loading-overlay").removeClass("hidden");
                $(".mdl-card").hide();

                if (!subscription) {
                    $(".subscription-card").show()
                        .promise()
                        .done(function() {
                            $("#subscribe-btn").prop("disabled", true);
                        });
                    $(".loading-overlay").addClass("hidden");
                    return;
                }

                var profileObj = JSON.parse(localStorage.getItem("profile"));

                $(".employee-name").html(profileObj.firstName.toLowerCase() + " " + profileObj.lastName.toLowerCase());
                $(".unsubscribe-card, #unsubscribe-btn, #profile-btn, #inbox-btn").show();

                console.log(JSON.stringify(subscription));

                $("#profile-accountid").val(profileObj.accountId);
                $("#profile-firstname").val(profileObj.firstName);
                $("#profile-lastname").val(profileObj.lastName);

                $(".loading-overlay").addClass("hidden");
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
                    url: restBaseUrl + "announcements/" + messageObj.announcementId + "/seen/" + profileObj.accountId,
                    error: function(jqxhr, error, thrownError) {
                        console.log(jqxhr);
                        console.log(error);
                        console.log(thrownError);
                    }
                });

                $(".mdl-card").hide();
                $(".notification-card").removeClass("has-media");
                $(".mdl-card__title-text", ".notification-card").text(messageObj.heading);
                $(".mdl-card__title", ".notification-card").css({
                    "background-image": "none"
                });

                console.log($(".mdl-card__title", ".notification-card").attr("style"));

                $(".mdl-card__supporting-text", ".notification-card")
                    .find("p").text(messageObj.content);
                $(".options-container", ".notification-card").empty();

                if (messageObj.options && messageObj.options.length) {
                    var optLen = messageObj.options.length;
                    for (x = 0; x < optLen; x++) {
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
                    $("#respond-btn").prop("disabled", true);
                    $(".mdl-card__actions", ".notification-card").show();
                } else {
                    $(".mdl-card__actions", ".notification-card").hide();
                }

                if (messageObj.imgId != "") {
                    console.log("imgId = ", messageObj.imgId);
                    var imgUrl = restBaseUrl + "images/" + messageObj.imgId;

                    $(".notification-card").addClass("has-media")
                        .find(".mdl-card__title").css({
                            'background-image': 'url(' + imgUrl + ')'
                        });

                    console.log($(".mdl-card__title", ".notification-card").attr("style"));
                }

                $(".notification-card").show();

                if ($(".mdl-layout__drawer.is-visible").length) {
                    var layout = document.querySelector('.mdl-layout');
                    layout.MaterialLayout.toggleDrawer();
                }
            }
        });

        $("input[type='text']", "#subscription-form").on("keyup", function(e) {
            var filledUp = true;

            $("#subscribe-btn").prop("disabled", true);
            $("input[type='text']", "#subscription-form").each(function() {
                if (!$.trim($(this).val()).length) filledUp = false;
            })

            if (filledUp) $("#subscribe-btn").prop("disabled", false);
        });

        $('#subscribe-btn').on('click', function(e) {
            e.preventDefault();

            if (!$(this).is(":disabled")) {
                $(".loading-overlay").removeClass("hidden");
                serviceWorkerRegistration.pushManager.subscribe({
                    userVisibleOnly: true
                }).then(function(subscription) {
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
                        url: restBaseUrl + "accounts",
                        success: function(resp) {
                            profileObj.accountId = resp.id;
                            localStorage.setItem("profile", JSON.stringify(profileObj));

                            $("#subscription-form")[0].reset();
                            $(".mdl-card").hide();
                            $(".employee-name").html(profileObj.firstName.toLowerCase() + " " + profileObj.lastName.toLowerCase());
                            $(".unsubscribe-card, #unsubscribe-btn, #profile-btn, #inbox-btn").show();
                            $("#profile-accountid").val(profileObj.accountId);
                            $("#profile-firstname").val(profileObj.firstName);
                            $("#profile-lastname").val(profileObj.lastName);
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
            }
        });

        $('#unsubscribe-btn').on('click', function(e) {
            e.preventDefault();

            if (confirm("Are you sure you want to unsubscribe from TeamCast?")) {
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
                                url: restBaseUrl + "accounts/" + profileObj.accountId,
                                complete: function() {
                                    localStorage.removeItem("profile");
                                    deleteIndexedDBStores();

                                    $("#profile-form")[0].reset();
                                    $(".mdl-card, #unsubscribe-btn, #profile-btn, #inbox-btn").hide();
                                    $(".subscription-card").show();
                                    $("#subscribe-btn").prop("disabled", true)
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
            }
        });

        $('#notif-card-close-btn').on('click', function(e) {
            e.preventDefault();

            $(".notification-card").hide();
            $(".mdl-card__supporting-text", ".notification-card")
                .find("p").text("");
            $(".options-container", ".notification-card").empty();
            $(".unsubscribe-card").show();
        });

        $(".card-close-btn").on("click", function(e) {
            e.preventDefault();

            var $lastShownCard = (localStorage.getItem("profile")) ? $(".unsubscribe-card") : $(".subscription-card");

            $(this).parent().hide();
            $lastShownCard.show();
        });

        $("body").on("click", ".mdl-radio", function() {
            $("#respond-btn").prop("disabled", false);
        });

        $("#respond-btn").on("click", function(e) {
            if (!$(this).is(":disabled")) {
                var profileObj = JSON.parse(localStorage.getItem("profile"));
                var responseObj = {
                    "option": $("input[type='radio']", ".mdl-radio.is-checked").val()
                }

                $.ajax({
                    type: 'POST',
                    data: JSON.stringify(responseObj),
                    contentType: "application/json",
                    url: restBaseUrl + "announcements/" + $(this).data("announcementid") + "/acknowledge/" + profileObj.accountId,
                    beforeSend: function() {
                        $(".loading-overlay").removeClass("hidden");
                    },
                    success: function(resp) {
                        $(".notification-card").hide();
                        $(".mdl-card__supporting-text", ".notification-card")
                            .find("p").text("");
                        $(".options-container", ".notification-card").empty();
                        $(".unsubscribe-card").show();
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
            }
        });

        $("#about-btn").on("click", function(e) {
            e.preventDefault();

            var layout = document.querySelector('.mdl-layout');

            $(".mdl-card").hide();
            $(".about-card").show();

            layout.MaterialLayout.toggleDrawer();
        })

        $("#profile-btn").on("click", function(e) {
            e.preventDefault();

            var layout = document.querySelector('.mdl-layout');

            $(".mdl-card").hide();
            $(".profile-card").show();

            layout.MaterialLayout.toggleDrawer();
        })

        $("#inbox-btn").on("click", function(e) {
            e.preventDefault();

            console.log("CACHED NOTIFICATIONS: ", getCachedNotifications());
        })
    });
} else {
    $("header, footer").remove();
    $(".loading-overlay").addClass("hidden");
    $(".not-supported-card").show();
    $(".teamcast-pwa.mdl-layout").removeClass("invisible");
}

var teamcastIDB;
var openDBRequest = window.indexedDB.open("teamcastIDB", 1);

openDBRequest.onsuccess = function(e) {
    teamcastIDB = e.target.result;
}
openDBRequest.onerror = function(e) {
    console.log("FROM CLIENT: Error opening IndexedDB");
}

var deleteIndexedDBStores = function() {
    teamcastIDB.deleteObjectStore("users");
    teamcastIDB.deleteObjectStore("notifications");
};

var getCachedNotifications = function() {
    var result = [];
    teamcastIDB.transaction("notifications")
        .objectStore("notifications")
        .getAll()
        .onsuccess = function(event) {
            //console.log(event.target.result);
            result.push.apply(event.target.result);
        }

    return result;
};