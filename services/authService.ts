import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  User as FirebaseUser
} from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, setDoc, updateDoc, getDoc } from "firebase/firestore";

export interface User {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  lastSeenChangelog?: number;
}

export const authService = {
  signup: async (name: string, email: string, pass: string, newsletterOptIn: boolean = false): Promise<User | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });

      // Guardar el email y la preferencia de newsletter (por defecto false)
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        preferences: { newsletterOptIn }
      }, { merge: true });

      // Fire-and-forget: enviar email de bienvenida sin bloquear al usuario
      void userCredential.user.getIdToken()
        .then((token) => fetch('/api/send-welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userName: name, userEmail: email }),
        }))
        .catch(err => console.warn('Welcome email failed:', err));

      return {
        id: userCredential.user.uid,
        name: name,
        email: email
      };
    } catch (error) {
      console.error("Signup error details:", error);
      throw error;
    }
  },

  login: async (email: string, pass: string): Promise<User | null> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      return {
        id: userCredential.user.uid,
        name: userCredential.user.displayName || email.split('@')[0],
        email: email
      };
    } catch (error) {
      console.error("Login error details:", error);
      throw error;
    }
  },

  loginWithGoogle: async (): Promise<User | null> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      return {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Usuario',
        email: user.email || ''
      };
    } catch (error: any) {
      console.error("Google login popup error, attempting redirect...", error);
      // Fallback a redirect method si el navegador bloquea el popup o iframe (común en Brave)
      if (
        error.code === 'auth/internal-error' ||
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/popup-blocked'
      ) {
        const provider = new GoogleAuthProvider();
        await signInWithRedirect(auth, provider);
        // Devuelve null porque signInWithRedirect recarga la página. 
        // El onAuthStateChanged lo capturará a la vuelta.
        return null;
      }
      throw error;
    }
  },

  updateProfileData: async (data: { name?: string; email?: string; password?: string }) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in");

    if (data.name) {
      await updateProfile(user, { displayName: data.name });
    }

    if (data.email && data.email !== user.email) {
      await updateEmail(user, data.email);
    }

    if (data.password) {
      await updatePassword(user, data.password);
    }
  },

  getCurrentUser: (): User | null => {
    const user = auth.currentUser;
    if (user) {
      return {
        id: user.uid,
        name: user.displayName || user.email?.split('@')[0] || 'Usuario',
        email: user.email || ''
      };
    }
    return null;
  },

  onAuthChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }

      // La sesión de Firebase Auth es suficiente para renderizar la app. No debemos
      // bloquear la interfaz esperando a Firestore, porque una conexión bloqueada o
      // lenta dejaría la pantalla de carga visible indefinidamente.
      const authenticatedUser: User = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        email: firebaseUser.email || '',
        lastSeenChangelog: 0,
      };
      callback(authenticatedUser);

      // El dato auxiliar se actualiza cuando Firestore responda, sin impedir el inicio.
      void getDoc(doc(db, 'users', firebaseUser.uid))
        .then((userDoc) => {
          if (userDoc.exists()) {
            callback({
              ...authenticatedUser,
              lastSeenChangelog: userDoc.data().lastSeenChangelog || 0,
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching user data from Firestore on auth change:", error);
        });
    });
  },

  markChangelogAsSeen: async (timestamp: number) => {
    if (!auth.currentUser) return;
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { lastSeenChangelog: timestamp });
    } catch (error) {
      console.error("Error updating lastSeenChangelog:", error);
    }
  },

  logout: async () => {
    await signOut(auth);
  },

  deleteAccount: async () => {
    const user = auth.currentUser;
    if (!user) return;

    // El servidor exige también que este inicio de sesión sea reciente. Hacer
    // la comprobación aquí evita borrar datos si el usuario debe reautenticarse.
    const tokenResult = await user.getIdTokenResult();
    const authTime = new Date(tokenResult.authTime).getTime();
    if (!Number.isFinite(authTime) || Date.now() - authTime > 5 * 60 * 1000) {
      throw new Error('REAUTH_NEEDED');
    }

    const token = await user.getIdToken();
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      throw new Error('REAUTH_NEEDED');
    }
    if (!response.ok) {
      throw new Error('DELETE_ACCOUNT_FAILED');
    }

    await signOut(auth);
  },

  resetPassword: async (email: string) => {
    const res = await fetch('/api/send-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error('RESET_FAILED');
  }
};
