import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth.js';
import { checkRateLimit } from './_utils/rateLimit.js';

// Modelos de Mistral AI - ordenados por prioridad
const MISTRAL_MODEL_PRIMARY = 'mistral-medium-2505';
const MISTRAL_MODEL_FALLBACK = 'mistral-medium-2508';
const MISTRAL_MODEL_LAST_RESORT = 'mistral-small';

const SYSTEM_PROMPT = 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.';

// Configuración de tokens según el modo
const MAX_TOKENS_JSON = 1500;
const MAX_TOKENS_TEXT = 2500;

async function callMistral(prompt: string, jsonMode: boolean, model: string): Promise<string> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) throw new Error('MISTRAL_API_KEY not configured');

    const maxTokens = jsonMode ? MAX_TOKENS_JSON : MAX_TOKENS_TEXT;

    const body: any = {
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: maxTokens,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new Error(`Mistral 429 rate limit (model: ${model}). Retry after: ${retryAfter || 'unknown'}s`);
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Mistral ${response.status} (model: ${model}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verificar autenticación
    const user = await verifyAuth(req);
    if (!user || 'error' in user) {
        const errorMsg = (user as any)?.error || 'Unauthorized';
        if (errorMsg.includes('Firebase Admin init failed') || errorMsg.includes('Faltan variables en el servidor')) {
            console.error('[generate-ai] Firebase Admin init failed:', errorMsg);
            return res.status(500).json({ error: errorMsg });
        }
        return res.status(401).json({ error: 'Unauthorized', details: errorMsg });
    }

    // Validar body
    const { prompt, jsonMode } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Prompt is required and must be a string' });
    }

    if (prompt.length > 30000) {
        return res.status(400).json({ error: 'Prompt is too long (limit: 30000 characters)' });
    }

    // Aplicar Rate Limit
    const isAllowed = await checkRateLimit(`ai:${user.uid}`, 100, 3600);
    if (!isAllowed) {
        return res.status(429).json({ error: 'Too Many Requests. Has superado tu límite de peticiones de IA por hora. Vuelve a intentarlo en un rato.' });
    }

    // Comprobar que Mistral API Key está configurada
    const hasMistral = !!process.env.MISTRAL_API_KEY;
    if (!hasMistral) {
        console.error('[generate-ai] No Mistral API key configured on server');
        return res.status(503).json({
            error: 'Servicio de IA no configurado. Falta MISTRAL_API_KEY en Vercel.',
        });
    }

    const errors: string[] = [];

    try {
        const origin = req.headers.origin || '';

        let text = '';

        // Intento 1: Modelo primario (mistral-medium-2505)
        try {
            text = await callMistral(prompt, !!jsonMode, MISTRAL_MODEL_PRIMARY);
        } catch (primaryError: any) {
            errors.push(`Mistral (${MISTRAL_MODEL_PRIMARY}): ${primaryError.message}`);
            console.warn('[generate-ai] Mistral primary failed:', primaryError.message);

            // Esperar antes del fallback
            await new Promise(resolve => setTimeout(resolve, 500));

            // Intento 2: Modelo fallback (mistral-medium-2508)
            try {
                text = await callMistral(prompt, !!jsonMode, MISTRAL_MODEL_FALLBACK);
            } catch (fallbackError: any) {
                errors.push(`Mistral (${MISTRAL_MODEL_FALLBACK}): ${fallbackError.message}`);
                console.warn('[generate-ai] Mistral fallback failed:', fallbackError.message);

                // Esperar antes del último intento
                await new Promise(resolve => setTimeout(resolve, 500));

                // Intento 3: Último recurso (mistral-small)
                try {
                    text = await callMistral(prompt, !!jsonMode, MISTRAL_MODEL_LAST_RESORT);
                } catch (lastResortError: any) {
                    errors.push(`Mistral (${MISTRAL_MODEL_LAST_RESORT}): ${lastResortError.message}`);
                    console.warn('[generate-ai] Mistral last resort failed:', lastResortError.message);
                    throw new Error('All Mistral models failed');
                }
            }
        }

        return res.status(200).json({ result: text });
    } catch (error: any) {
        const finalError = errors.length > 0 ? errors.join(' | ') : error.message || 'Internal Server Error';
        console.error('[generate-ai] All providers failed:', finalError);
        return res.status(500).json({ error: finalError });
    }
}

