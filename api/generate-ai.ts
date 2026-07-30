import { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth.js';
import { checkRateLimit } from './_utils/rateLimit.js';
import { executeWithFallback } from './_providers/router.js';
import type { TaskType } from './_providers/types.js';

const DEFAULT_SYSTEM_PROMPT = 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.';

const VALID_TASKS: TaskType[] = [
  'mood_report',
  'mood_prediction',
  'emotional_insights',
  'context_analysis',
  'mood_buddy_interaction',
  'vibe_recommendation',
  'music_recommendation',
  'game_config',
];

const MAX_TOKENS_JSON = 1500;
const MAX_TOKENS_TEXT = 2500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyAuth(req);
  if (!user || 'error' in user) {
    const errorMsg = (user as any)?.error || 'Unauthorized';
    if (errorMsg.includes('Firebase Admin init failed') || errorMsg.includes('Faltan variables en el servidor')) {
      console.error('[generate-ai] Firebase Admin init failed:', errorMsg);
      return res.status(500).json({ error: errorMsg });
    }
    return res.status(401).json({ error: 'Unauthorized', details: errorMsg });
  }

  const { prompt, jsonMode, task, systemPrompt, maxTokens, temperature, model: preferredModel } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string' });
  }
  if (prompt.length > 30000) {
    return res.status(400).json({ error: 'Prompt is too long (limit: 30000 characters)' });
  }
  if (task && !VALID_TASKS.includes(task)) {
    return res.status(400).json({ error: `Invalid task. Allowed: ${VALID_TASKS.join(', ')}` });
  }

  const isAllowed = await checkRateLimit(`ai:${user.uid}`, 100, 3600);
  if (!isAllowed) {
    return res.status(429).json({
      error: 'Too Many Requests. Has superado tu límite de peticiones de IA por hora. Vuelve a intentarlo en un rato.',
    });
  }

  try {
    const effectiveMaxTokens =
      typeof maxTokens === 'number' && maxTokens > 0
        ? maxTokens
        : jsonMode
          ? MAX_TOKENS_JSON
          : MAX_TOKENS_TEXT;

    const result = await executeWithFallback(
      {
        prompt,
        jsonMode: !!jsonMode,
        systemPrompt: systemPrompt || DEFAULT_SYSTEM_PROMPT,
        maxTokens: effectiveMaxTokens,
        temperature: typeof temperature === 'number' ? temperature : 0.8,
        task: (task as TaskType) || 'mood_report',
      },
      (task as TaskType) || 'mood_report',
      typeof preferredModel === 'string' ? preferredModel : undefined
    );

    return res.status(200).json({
      result: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error: any) {
    console.error('[generate-ai] All providers failed:', error.message);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
