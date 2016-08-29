reg = null;

if ('serviceWorker' in navigator) {
    console.log('Service Worker is supported');
    navigator.serviceWorker.register('sw.js').then(function(reg) {
        console.log('sw.js registered. ', reg);
        reg.pushManager.subscribe({
            userVisibleOnly: true
        }).then(function(sub) {
            console.log('endpoint:', sub.endpoint);
            $("#endpoint-id").html(sub.endpoint);
        });
    }).catch(function(error) {
        console.log('Error: ', error);
    });
}