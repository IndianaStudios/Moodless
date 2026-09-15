
import { app, db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import type { Messaging } from 'firebase/messaging';

// Sustituye esto con tu "Key Pair" de la pestaña Cloud Messaging en Firebase
const VAPID_KEY = "BJe98i81m5q5VZy5HxfRg_tnooZOCxJt7Nl0B5QjO1UW0J8714v-dIKD6tA_7cW4ocj9f7GPvMJe9hu0CBPHTlg";

type FcmRuntime = {
  messaging: Messaging;
  sdk: typeof import('firebase/messaging');
};

let fcmRuntimePromise: Promise<FcmRuntime | null> | null = null;

const getFcmRuntime = (): Promise<FcmRuntime | null> => {
  if (fcmRuntimePromise) return fcmRuntimePromise;
  fcmRuntimePromise = (async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
    const sdk = await import('firebase/messaging');
    if (!(await sdk.isSupported())) return null;
    return { messaging: sdk.getMessaging(app), sdk };
  })().catch((error) => {
    console.warn('Firebase Messaging no disponible en este entorno:', error);
    return null;
  });
  return fcmRuntimePromise;
};

const getMessagingWorkerUrl = () => {
  const params = new URLSearchParams();
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  Object.entries(config).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
};

export const notificationService = {
  requestPermission: async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    return permission;
  },

  getPermissionStatus: (): NotificationPermission => {
    return 'Notification' in window ? Notification.permission : 'denied';
  },

  // Obtener Token de FCM para notificaciones Push desde la nube
  initFCM: async (userId: string) => {
    const fcm = await getFcmRuntime();
    if (!fcm) {
      console.warn("Este navegador no soporta FCM.");
      return;
    }

    try {
      if (!('serviceWorker' in navigator)) {
        console.warn("Service Worker no soportado.");
        return;
      }

      // El worker recibe únicamente configuración pública de Firebase. Registrarlo
      // aquí evita descargar Messaging hasta que el usuario active notificaciones.
      const registration = await navigator.serviceWorker.register(getMessagingWorkerUrl());
      await navigator.serviceWorker.ready;

      if (Notification.permission === 'granted') {
        const token = await fcm.sdk.getToken(fcm.messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (token) {
          // Capturar la zona horaria del dispositivo
          const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
            timeZone: userTimeZone,
            'preferences.notificationsEnabled': true
          }).catch(async () => {
            await setDoc(userRef, {
              fcmTokens: [token],
              timeZone: userTimeZone,
              preferences: { notificationsEnabled: true }
            }, { merge: true });
          });
        }
      } else {
        console.warn("Permiso de notificación denegado por el usuario.");
      }
    } catch (error) {
      console.error("Error al inicializar FCM:", error);
    }
  },

  savePreference: async (userId: string, enabled: boolean) => {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      preferences: { notificationsEnabled: enabled }
    }, { merge: true });
  },

  getPreference: async (userId: string): Promise<boolean> => {
    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      return snap.exists() ? snap.data()?.preferences?.notificationsEnabled : false;
    } catch {
      return false;
    }
  },

  sendImmediate: async (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, {
            body,
            icon: '/logo.jpg',
            badge: '/badge.png',
            tag: 'moodless-notif'
          });
          return;
        }
      } catch (e) {
        console.error("SW notification failed:", e);
      }

      // Fallback para navegadores de escritorio viejo sin SW
      try {
        new Notification(title, {
          body,
          icon: '/logo.jpg',
          badge: '/badge.png',
          tag: 'moodless-notif'
        });
      } catch (fallbackError) {
        console.error("Fallback notification failed:", fallbackError);
      }
    }
  },

  // Escuchar mensajes cuando la app está abierta (Foreground)
  listenForForegroundMessages: async () => {
    const fcm = await getFcmRuntime();
    if (!fcm) return;

    fcm.sdk.onMessage(fcm.messaging, (payload) => {
      notificationService.sendImmediate(
        payload.notification?.title || "Aviso de Moodless",
        payload.notification?.body || "Tienes una nueva actualización."
      );
    });
  }
};
