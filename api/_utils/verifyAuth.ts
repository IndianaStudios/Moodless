/**
 * Middleware de autenticación para endpoints API de Vercel.
 * Verifica el token JWT de Firebase Auth enviado en el header Authorization.
 */
import admin from 'firebase-admin';
import type { VercelRequest } from '@vercel/node';

function getFirebaseAdmin() {
    const existingApps = admin.apps ?? [];
    if (existingApps.length > 0 && existingApps[0]) return existingApps[0];

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        const missing = [];
        if (!projectId) missing.push('FIREBASE_PROJECT_ID');
        if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
        if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
        throw new Error(`Faltan variables en el servidor: ${missing.join(', ')}. Revisa el dashboard de Vercel.`);
    }

    // Limpieza de la clave privada (Vercel suele escapar los saltos de línea)
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }

    try {
        return admin.initializeApp({
            credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
    } catch (initError: any) {
        if (initError.message.includes('already exists')) {
            return admin.app();
        }
        throw new Error(`Error inicializando Firebase Admin: ${initError.message}`);
    }
}

export { getFirebaseAdmin };

export async function verifyAuth(req: VercelRequest): Promise<{ uid: string; email?: string } | { error: string }> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { error: 'No Authorization header' };
        }

        const token = authHeader.split('Bearer ')[1];
        if (!token) return { error: 'Token is empty' };

        const adminApp = getFirebaseAdmin();
        const decoded = await adminApp.auth().verifyIdToken(token);

        return {
            uid: decoded.uid,
            email: decoded.email,
        };
    } catch (error: any) {
        console.error('Auth verification failed:', error);
        return { error: `Server Auth Error: ${error.message}` };
    }
}
