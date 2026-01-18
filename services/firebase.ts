
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyD8RrlU7DWcpqh4RBWrlyevEPR7HTTqINM", 
  authDomain: "moodless-4you.firebaseapp.com",
  projectId: "moodless-4you",
  storageBucket: "moodless-4you.firebasestorage.app",
  messagingSenderId: "85765511157",
  appId: "1:85765511157:web:ec7be81b029b0b892df2bc"
};

const app = initializeApp(firebaseConfig);
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
