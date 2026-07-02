import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

privateKey = privateKey.replace(/\\n/g, '\n');
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});

const auth = getAuth(app);

// 1. Create a custom token
console.log('Creating custom token...');
const customToken = await auth.createCustomToken('test-user-uid-12345');

// 2. Exchange for ID token
console.log('Exchanging custom token for ID token...');
const apiKey = process.env.VITE_FIREBASE_API_KEY;
const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: customToken, returnSecureToken: true }),
});

const data = await res.json();
if (data.idToken) {
  console.log('SUCCESS! ID Token obtained:', data.idToken);
} else {
  console.error('Failed to get ID token:', data);
}
