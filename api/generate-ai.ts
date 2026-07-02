import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth.js';
import { checkRateLimit } from './_utils/rateLimit.js';

const OPENROUTER_MODEL = 'openai/gpt-oss-120b:free';
const GROQ_MODEL = 'openai/gpt-oss-120b';

async function callGroq(prompt: string, jsonMode: boolean = false): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY not configured');

    const body: any = {
        model: GROQ_MODEL,
        messages: [
            { role: 'system', content: 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
    };

    if (jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Groq error ${response.status}: ${JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouter(prompt: string, jsonMode: boolean = false, origin: string = '', modelOverride?: string): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured');

    const body: any = {
        model: modelOverride || OPENROUTER_MODEL,
        messages: [
            { role: 'system', content: 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 4000,
    };

    if (jsonMode) {
        body.response_format = { type: 'json_object' };
    }

    const maxRetries = 2;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
            const waitTime = 2000 * attempt;
            console.log(`OpenRouter retry ${attempt}/${maxRetries}, waiting ${waitTime}ms...`);
            await new Promise(r => setTimeout(r, waitTime));
        }

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

        if (response.status === 429) {
            console.warn(`OpenRouter 429 rate limit on attempt ${attempt + 1}`);
            if (attempt === maxRetries - 1) throw new Error('OpenRouter rate limit exceeded');
            continue;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter error ${response.status}: ${JSON.stringify(err)}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    throw new Error('OpenRouter fallback failed');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verificar autenticación
    const user = await verifyAuth(req);
    if (!user || 'error' in user) {
        return res.status(401).json({ error: 'Unauthorized', details: (user as any)?.error });
    }

    try {
        const { prompt, jsonMode } = req.body;

        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ error: 'Prompt is required and must be a string' });
        }

        if (prompt.length > 30000) {
            return res.status(400).json({ error: 'Prompt is too long (limit: 30000 characters)' });
        }

        // Aplicar Rate Limit: 100 peticiones por hora (3600 segundos) por usuario
        const isAllowed = await checkRateLimit(`ai:${user.uid}`, 100, 3600);
        if (!isAllowed) {
            return res.status(429).json({ error: 'Too Many Requests. Has superado tu límite de peticiones de IA por hora. Vuelve a intentarlo en un rato.' });
        }

        const origin = req.headers.origin || '';

        let text = '';
        try {
            text = await callGroq(prompt, jsonMode);
        } catch (groqError: any) {
            console.warn('Groq primary failed, trying OpenRouter fallback...', groqError.message);
            try {
                // Pequeña pausa para evitar colisiones
                await new Promise(resolve => setTimeout(resolve, 500));
                text = await callOpenRouter(prompt, jsonMode, origin);
            } catch (orError: any) {
                console.warn('OpenRouter primary failed, trying super-fast fallback...', orError.message);
                // PLAN C: Usar un modelo más ligero (70B) que casi nunca falla por rate limit
                const FAST_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
                text = await callOpenRouter(prompt, jsonMode, origin, FAST_MODEL);
            }
        }

        return res.status(200).json({ result: text });
    } catch (error: any) {
        const message = error?.message || String(error) || 'Internal Server Error';
        console.error('AI Generation Error:', message);
        return res.status(500).json({ error: message });
    }
}
