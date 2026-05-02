
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// 1. Extraer la configuración de los parámetros de búsqueda (query params)
const urlParams = new URLSearchParams(location.search);

firebase.initializeApp({
    apiKey: urlParams.get('apiKey'),
    authDomain: urlParams.get('authDomain'),
    projectId: urlParams.get('projectId'),
    storageBucket: urlParams.get('storageBucket'),
    messagingSenderId: urlParams.get('messagingSenderId'),
    appId: urlParams.get('appId')
});

const messaging = firebase.messaging();

self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notificación clickeada', event.notification);
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // Si la ventana ya está abierta, pon el foco en ella
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url.includes('/') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no está abierta, abre una nueva
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
