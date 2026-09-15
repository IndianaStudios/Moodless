/// <reference types="vite/client" />

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);

// Inicialización de App Check si tenemos la clave reCAPTCHA configurada (esencial para la seguridad en producción)
if (typeof window !== 'undefined') {
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  if (isDev) {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  } else if (recaptchaKey && recaptchaKey !== 'TU_CLAVE_DE_RECAPTCHA_AQUI') {
    // App Check no bloquea el primer render ni añade su SDK a la carga crítica.
    void import('firebase/app-check')
      .then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaKey),
          isTokenAutoRefreshEnabled: true,
        });
      })
      .catch((error) => console.warn('Error inicializando App Check:', error));
  }
}

export const auth = getAuth(app);

// Inicialización de Firestore con persistencia local IndexedDB multi-pestaña para carga instantánea (0ms)
let firestoreDb;
if (typeof window !== 'undefined') {
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (e) {
    firestoreDb = getFirestore(app);
  }
} else {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
