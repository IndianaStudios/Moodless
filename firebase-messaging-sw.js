
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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje en segundo plano recibido ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.jpg'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Requerido para que el navegador lo detecte como PWA instalable
self.addEventListener('fetch', () => {
  // Permite que la app sea instalable
});
