import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Endpoint de diagnóstico TEMPORAL — borrar tras resolver el 500.
 * GET /api/debug-env → devuelve qué variables de entorno están presentes (no sus valores).
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
    const vars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY',
        'GROQ_API_KEY',
        'OPENROUTER_API_KEY',
        'YOUTUBE_API_KEY',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
    ];

    const result: Record<string, string> = {};
    for (const v of vars) {
        const val = process.env[v];
        if (!val) {
            result[v] = '❌ MISSING';
        } else if (v === 'FIREBASE_PRIVATE_KEY') {
            // Solo mostramos inicio/fin para verificar formato sin exponer la clave
            const clean = val.replace(/\\n/g, '\n');
            result[v] = `✅ present | starts: ${clean.slice(0, 28)} | ends: ${clean.slice(-25)} | length: ${clean.length}`;
        } else {
            result[v] = `✅ present (${val.length} chars)`;
        }
    }

    return res.status(200).json(result);
}
