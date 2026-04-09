/**
 * Middleware de autenticación para endpoints API de Vercel.
 * Verifica el token JWT de Firebase Auth enviado en el header Authorization.
 * 
 * Uso en el cliente:
 *   const token = await auth.currentUser.getIdToken();
 *   fetch('/api/endpoint', { headers: { Authorization: `Bearer ${token}` } });
 */
import admin from 'firebase-admin';
import type { VercelRequest } from '@vercel/node';

function getFirebaseAdmin() {
    const existingApps = admin.apps ?? [];
    if (existingApps.length > 0) return admin;

    let projectId = process.env.FIREBASE_PROJECT_ID;
    let clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    // Plan C: Forzar carga manual si Vercel CLI en Windows no las detecta
    if (!projectId || !clientEmail || !privateKey) {
        try {
            const fs = require('fs');
            const path = require('path');
            const envPath = path.resolve(process.cwd(), '.env');
            if (fs.existsSync(envPath)) {
                const content = fs.readFileSync(envPath, 'utf8');
                content.split('\n').forEach((line: string) => {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine.startsWith('#')) return;
                    const parts = trimmedLine.split('=');
                    const key = parts[0].trim();
                    const value = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
                    if (key === 'FIREBASE_PROJECT_ID') projectId = value;
                    if (key === 'FIREBASE_CLIENT_EMAIL') clientEmail = value;
                    if (key === 'FIREBASE_PRIVATE_KEY') privateKey = value;
                });
            }
        } catch (e) {
            console.error('Manual Env Load Failed:', e);
        }
    }

    if (!projectId || !clientEmail || !privateKey) {
        console.error('Environment check failed:', {
            hasProjectId: !!projectId,
            hasClientEmail: !!clientEmail,
            hasPrivateKey: !!privateKey
        });
        throw new Error('Missing Firebase Admin env vars.');
    }

    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
    }

    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });

    return admin;
}

export { getFirebaseAdmin };

export interface AuthResult {
    uid: string;
    email?: string;
}

/**
 * Verifica el token Bearer del header Authorization.
 * Devuelve la info del usuario decodificada o null si no es válido.
 */
export async function verifyAuth(req: VercelRequest): Promise<{ uid: string; email?: string } | { error: string }> {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return { error: 'No Authorization header found or malformed Bearer' };
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
        return { error: `Verification Exception: ${error.message}` };
    }
}
