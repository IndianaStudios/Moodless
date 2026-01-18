
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser,
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from "firebase/auth";
import { auth } from "./firebase";

export interface User {
  id: string;
  name: string;
  email?: string;
}

export const authService = {
  signup: async (name: string, email: string, pass: string): Promise<User | null> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(userCredential.user, { displayName: name });

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
    } catch (error) {
      console.error("Google login error:", error);
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
      if (firebaseUser) {
        callback({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
          email: firebaseUser.email || ''
        });
      } else {
        callback(null);
      }
    });
  },

  logout: async () => {
    await signOut(auth);
  },

  deleteAccount: async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteUser(user);
      } catch (error: any) {
        // Firebase requiere login reciente para borrar cuenta
        if (error.code === 'auth/requires-recent-login') {
          throw new Error("REAUTH_NEEDED");
        }
        throw error;
      }
    }
  }
};
