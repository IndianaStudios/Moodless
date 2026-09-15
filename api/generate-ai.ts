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
  'context_summarization',
  'mood_buddy_interaction',
  'vibe_recommendation',
  'music_recommendation',
  'game_config',
];

const MAX_PROMPT_CHARACTERS = 12_000;
const TASK_BUDGETS: Record<TaskType, { maxTokens: number; temperature: number }> = {
  mood_report: { maxTokens: 1_200, temperature: 0.6 },
  mood_prediction: { maxTokens: 900, temperature: 0.4 },
  emotional_insights: { maxTokens: 1_500, temperature: 0.6 },
  context_analysis: { maxTokens: 800, temperature: 0.4 },
  context_summarization: { maxTokens: 700, temperature: 0.3 },
  mood_buddy_interaction: { maxTokens: 500, temperature: 0.7 },
  vibe_recommendation: { maxTokens: 180, temperature: 0.7 },
  music_recommendation: { maxTokens: 700, temperature: 0.5 },
  game_config: { maxTokens: 700, temperature: 0.4 },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verifyAuth(req);
  if (!user || 'error' in user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { prompt, jsonMode, task } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string' });
  }
  if (prompt.length > MAX_PROMPT_CHARACTERS) {
    return res.status(400).json({ error: `Prompt is too long (limit: ${MAX_PROMPT_CHARACTERS} characters)` });
  }
  if (task && !VALID_TASKS.includes(task)) {
    return res.status(400).json({ error: `Invalid task. Allowed: ${VALID_TASKS.join(', ')}` });
  }

  const isAllowed = await checkRateLimit(`ai:${user.uid}`, 60, 3600);
  if (!isAllowed) {
    return res.status(429).json({
      error: 'Too Many Requests. Has superado tu límite de peticiones de IA por hora. Vuelve a intentarlo en un rato.',
    });
  }

  try {
    const effectiveTask = (task as TaskType) || 'mood_report';
    const budget = TASK_BUDGETS[effectiveTask];

    const result = await executeWithFallback(
      {
        prompt,
        jsonMode: !!jsonMode,
        // El cliente no puede elevar presupuesto, temperatura, modelo ni prompt
        // de sistema: son decisiones de coste y seguridad del servidor.
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        maxTokens: budget.maxTokens,
        temperature: budget.temperature,
        task: effectiveTask,
      },
      effectiveTask
    );

    return res.status(200).json({
      result: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error: any) {
    console.error('[generate-ai] All providers failed:', error.message);
    return res.status(500).json({ error: 'AI service is temporarily unavailable' });
  }
}
