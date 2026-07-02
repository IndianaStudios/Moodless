import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing variables:', { projectId, clientEmail, hasPrivateKey: !!privateKey });
  process.exit(1);
}

privateKey = privateKey.replace(/\\n/g, '\n');
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

try {
  const app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  console.log('Successfully initialized firebase-admin!', { name: app.name });
  
  // Test Firestore
  const db = getFirestore(app);
  console.log('Testing Firestore collection access...');
  const collections = await db.listCollections();
  console.log('Collections fetched successfully:', collections.map(c => c.id));
} catch (err) {
  console.error('Firebase Admin operation failed:', err);
}
