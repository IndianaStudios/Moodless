/**
 * Middleware de autenticación para endpoints API de Vercel.
 * Verifica el token JWT de Firebase Auth enviado en el header Authorization.
 */
import { cert, initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { VercelRequest } from '@vercel/node';

function getFirebaseAdmin() {
    // En firebase-admin v14 la API correcta es getApps() del módulo firebase-admin/app
    if (getApps().length > 0) return getApp();

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

    return initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
    });
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

        let adminApp;
        try {
            adminApp = getFirebaseAdmin();
        } catch (initError: any) {
            console.error('[verifyAuth] Firebase Admin init failed:', initError?.message);
            return { error: `Firebase Admin init failed: ${initError?.message}` };
        }

        const decoded = await getAuth(adminApp).verifyIdToken(token);

        return {
            uid: decoded.uid,
            email: decoded.email,
        };
    } catch (error: any) {
        console.error('Auth verification failed:', error);
        return { error: `Server Auth Error: ${error.message}` };
    }
}
