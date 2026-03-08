
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyD8RrlU7DWcpqh4RBWrlyevEPR7HTTqINM",
    authDomain: "moodless-4you.firebaseapp.com",
    projectId: "moodless-4you",
    storageBucket: "moodless-4you.firebasestorage.app",
    messagingSenderId: "85765511157",
    appId: "1:85765511157:web:ec7be81b029b0b892df2bc"
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
