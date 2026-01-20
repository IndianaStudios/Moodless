
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
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token),
            'preferences.notificationsEnabled': true
          }).catch(async () => {
            await setDoc(userRef, {
              fcmTokens: [token],
              preferences: { notificationsEnabled: true }
            }, { merge: true });
          });
          console.log("FCM Token registrado con éxito");
        }
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

  sendImmediate: (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/599/599305.png',
        tag: 'moodless-notif'
      });
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
  },

  scheduleCheck: async (userId: string, userName: string, alreadyLogged: boolean) => {
    const isEnabled = await notificationService.getPreference(userId);
    const permission = notificationService.getPermissionStatus();

    if (isEnabled && !alreadyLogged && permission === 'granted') {
      setTimeout(() => {
        notificationService.sendImmediate(
          "Moodless: Tu racha está en peligro",
          `¡Hola, ${userName}! No olvides dedicarle un momento de tu día a registrar tu aura. ✨`
        );
      }, 10000);
    }
  }
};
