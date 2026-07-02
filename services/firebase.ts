/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// Inicialización de App Check si tenemos la clave reCAPTCHA configurada (esencial para la seguridad)
if (typeof window !== 'undefined') {
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (recaptchaKey && recaptchaKey !== 'TU_CLAVE_DE_RECAPTCHA_AQUI') {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (error) {
      console.warn("Error inicializando App Check:", error);
    }
  } else {
    console.warn("⚠️ App Check no inicializado. Falla VITE_RECAPTCHA_SITE_KEY.");
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Inicialización segura de Messaging
let messagingInstance = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messagingInstance = getMessaging(app);
  } catch (e) {
    console.warn("Firebase Messaging no disponible en este entorno:", e);
  }
}

export const messaging = messagingInstance;
