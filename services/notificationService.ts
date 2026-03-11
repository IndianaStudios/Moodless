
import { db, messaging } from './firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getToken, onMessage, isSupported } from 'firebase/messaging';

// Sustituye esto con tu "Key Pair" de la pestaña Cloud Messaging en Firebase
const VAPID_KEY = "BJe98i81m5q5VZy5HxfRg_tnooZOCxJt7Nl0B5QjO1UW0J8714v-dIKD6tA_7cW4ocj9f7GPvMJe9hu0CBPHTlg";

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
    if (!messaging) return;

    // Verificación asíncrona de soporte para evitar errores críticos
    const supported = await isSupported();
    if (!supported) {
      console.warn("Este navegador no soporta FCM.");
      return;
    }

    try {
      if (!('serviceWorker' in navigator)) {
        console.warn("Service Worker no soportado.");
        return;
      }

      // Esperar a que el SW esté listo
      const registration = await navigator.serviceWorker.ready;
      console.log("Service Worker listo para FCM:", registration.scope);

      const permission = await Notification.requestPermission();
      console.log("Estado de permiso de notificación:", permission);

      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: registration
        });

        if (token) {
          console.log("FCM Token obtenido:", token.substring(0, 10) + "...");
          
          // Capturar la zona horaria del dispositivo
          const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          console.log("Zona horaria detectada:", userTimeZone);

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
          console.log("FCM Token y TimeZone sincronizados en Firestore");
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
          tag: 'moodless-notif'
        });
      } catch (fallbackError) {
        console.error("Fallback notification failed:", fallbackError);
      }
    }
  },

  // Escuchar mensajes cuando la app está abierta (Foreground)
  listenForForegroundMessages: async () => {
    if (!messaging) return;
    const supported = await isSupported();
    if (!supported) return;

    onMessage(messaging, (payload) => {
      console.log('Mensaje FCM recibido:', payload);
      notificationService.sendImmediate(
        payload.notification?.title || "Aviso de Moodless",
        payload.notification?.body || "Tienes una nueva actualización."
      );
    });
  }
};
