import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth.js';
import { checkRateLimit } from './_utils/rateLimit.js';

const GROQ_MODEL = 'openai/gpt-oss-120b'; // Modelo estable de Groq
const OPENROUTER_MODEL_PRIMARY = 'openai/gpt-oss-120b:free';
const OPENROUTER_MODEL_FALLBACK = 'meta-llama/llama-3.3-70b-instruct:free';

const SYSTEM_PROMPT = 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.';

async function callGroq(prompt: string, jsonMode: boolean): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not set in Vercel environment variables');

    const body: any = {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq ${response.status}: ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(prompt: string, jsonMode: boolean, origin: string, model: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in Vercel environment variables');

    const body: any = {
        model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
    };
    if (jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': origin || 'https://moodless.vercel.app',
            'X-Title': 'Moodless',
        },
        body: JSON.stringify(body),
    });

    if (response.status === 429) throw new Error(`OpenRouter 429 rate limit (model: ${model})`);

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter ${response.status} (model: ${model}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 1. Autenticación — capturamos excepciones por si Firebase Admin falla al inicializar
    let user: any;
    try {
        user = await verifyAuth(req);
    } catch (authError: any) {
        const msg = authError?.message || String(authError);
        console.error('[generate-ai] verifyAuth exception:', msg);
        return res.status(500).json({ error: `Auth init failed: ${msg}` });
    }

    if (!user || 'error' in user) {
        return res.status(401).json({ error: 'Unauthorized', details: (user as any)?.error });
    }

    // 2. Validar body
    const { prompt, jsonMode } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'prompt is required (string)' });
    }
    if (prompt.length > 30000) {
        return res.status(400).json({ error: 'Prompt too long (max 30000 chars)' });
    }

    // 3. Rate limit
    const isAllowed = await checkRateLimit(`ai:${user.uid}`, 100, 3600);
    if (!isAllowed) {
        return res.status(429).json({ error: 'Límite de peticiones de IA por hora superado. Vuelve más tarde.' });
    }

    // 4. Llamada a IA con fallbacks
    const origin = (req.headers.origin as string) || '';
    const errors: string[] = [];

    try {
        const text = await callGroq(prompt, !!jsonMode);
        return res.status(200).json({ result: text });
    } catch (e: any) {
        errors.push(`Groq: ${e.message}`);
        console.warn('[generate-ai] Groq failed:', e.message);
    }

    await new Promise(r => setTimeout(r, 300));

    try {
        const text = await callOpenRouter(prompt, !!jsonMode, origin, OPENROUTER_MODEL_PRIMARY);
        return res.status(200).json({ result: text });
    } catch (e: any) {
        errors.push(`OpenRouter primary: ${e.message}`);
        console.warn('[generate-ai] OpenRouter primary failed:', e.message);
    }

    await new Promise(r => setTimeout(r, 300));

    try {
        const text = await callOpenRouter(prompt, !!jsonMode, origin, OPENROUTER_MODEL_FALLBACK);
        return res.status(200).json({ result: text });
    } catch (e: any) {
        errors.push(`OpenRouter fallback: ${e.message}`);
        console.warn('[generate-ai] OpenRouter fallback failed:', e.message);
    }

    const finalError = errors.join(' | ');
    console.error('[generate-ai] All providers failed:', finalError);
    return res.status(500).json({ error: finalError });
}

