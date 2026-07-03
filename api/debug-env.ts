import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth.js';
import { isAdmin } from './_utils/isAdmin.js';

/**
 * Endpoint de diagnóstico — solo admin.
 * GET /api/debug-env → indica qué variables están presentes (sin exponer valores).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const user = await verifyAuth(req);
    if (!user || 'error' in user || !isAdmin(user.email)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const vars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'MISTRAL_API_KEY',
        'YOUTUBE_API_KEY',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'QSTASH_CURRENT_SIGNING_KEY',
        'QSTASH_NEXT_SIGNING_KEY',
    ];

    const result: Record<string, boolean> = {};
    for (const v of vars) {
        result[v] = !!process.env[v];
    }

    return res.status(200).json(result);
}
