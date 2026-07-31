import type { AIProvider, AIProviderName, AIRequest, TaskType } from './types.js';
import { GeminiProvider } from './gemini.js';
import { GroqProvider } from './groq.js';
import { MistralProvider } from './mistral.js';

export interface RouteStep {
  provider: AIProviderName;
  model: string;
}

export const ROUTES: Record<TaskType, RouteStep[]> = {
  mood_report: [
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  mood_prediction: [
    { provider: 'gemini', model: 'gemma-4-12b-it' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  emotional_insights: [
    { provider: 'gemini', model: 'gemma-4-12b-it' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  context_analysis: [
    { provider: 'groq', model: 'openai/gpt-oss-120b' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  context_summarization: [
    { provider: 'groq', model: 'openai/gpt-oss-120b' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  mood_buddy_interaction: [
    { provider: 'gemini', model: 'gemma-4-12b-it' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  vibe_recommendation: [
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  music_recommendation: [
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
    { provider: 'gemini', model: 'gemma-4-31b-it' },
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
  game_config: [
    { provider: 'gemini', model: 'gemma-4-26b-a4b-it' },
    { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    { provider: 'mistral', model: 'mistral-small-latest' },
  ],
};

export class ProviderRegistry {
  private providers: Map<AIProviderName, AIProvider>;
  private circuitState: Map<string, { failures: number; openedAt: number }> = new Map();

  constructor() {
    this.providers = new Map();
    this.providers.set(
      'gemini',
      new GeminiProvider(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)
    );
    this.providers.set(
      'groq',
      new GroqProvider(process.env.GROQ_API_KEY)
    );
    this.providers.set(
      'mistral',
      new MistralProvider(process.env.MISTRAL_API_KEY)
    );
  }

  get(name: AIProviderName): AIProvider | undefined {
    return this.providers.get(name);
  }

  isOpen(key: string): boolean {
    const state = this.circuitState.get(key);
    if (!state) return true;
    if (state.failures < 3) return true;
    const cooldownMs = 30_000;
    if (Date.now() - state.openedAt > cooldownMs) {
      this.circuitState.delete(key);
      return true;
    }
    return false;
  }

  recordFailure(key: string): void {
    const state = this.circuitState.get(key) || { failures: 0, openedAt: 0 };
    state.failures += 1;
    if (state.failures >= 3) {
      state.openedAt = Date.now();
    }
    this.circuitState.set(key, state);
  }

  recordSuccess(key: string): void {
    this.circuitState.delete(key);
  }
}

let _registry: ProviderRegistry | null = null;

export function getRegistry(): ProviderRegistry {
  if (!_registry) _registry = new ProviderRegistry();
  return _registry;
}

export async function executeWithFallback(
  req: AIRequest,
  task: TaskType,
  preferredModel?: string
): Promise<{ text: string; provider: AIProviderName; model: string; errors: string[] }> {
  const registry = getRegistry();
  const route = [...(ROUTES[task] || ROUTES.mood_report)];
  // Si el cliente pide un modelo específico, lo normalizamos y lo ponemos como primer paso del cascade
  if (preferredModel && typeof preferredModel === 'string' && preferredModel.trim()) {
    const normalized = preferredModel.trim();
    const exists = route.some(step => step.model === normalized);
    if (!exists) {
      // Buscar el identificador canónico en TODOS los providers configurados
      // (gemini, groq, mistral) por prefix-match. Esto permite enviar nombres
      // cortos como 'llama-3.1-8b-instant' o 'gemma-4-26b-a4b' sin necesidad
      // de conocer el sufijo canónico ('-it', '-instruct', etc.).
      for (const providerName of ['gemini', 'groq', 'mistral'] as const) {
        const provider = registry.get(providerName);
        if (provider && provider.isConfigured) {
          const known = provider.listModels().find(m => m.startsWith(normalized));
          if (known) {
            route.unshift({ provider: providerName, model: known });
            break;
          }
        }
      }
    } else {
      // Reordenar para que sea primero
      const idx = route.findIndex(step => step.model === normalized);
      if (idx > 0) {
        const [hit] = route.splice(idx, 1);
        route.unshift(hit);
      }
    }
  }
  // Filtrar el cascade para saltar providers no configurados.
  // Esto evita el ruido de "groq: not configured" cuando Groq no tiene API key.
  const errors: string[] = [];
  const configuredRoute = route.filter(step => {
    const provider = registry.get(step.provider);
    return provider && provider.isConfigured;
  });

  if (configuredRoute.length === 0) {
    throw new Error('No AI providers configured. Set GEMINI_API_KEY, GROQ_API_KEY or MISTRAL_API_KEY in the server environment.');
  }

  for (const step of configuredRoute) {
    const circuitKey = `${step.provider}:${step.model}`;
    if (!registry.isOpen(circuitKey)) {
      errors.push(`${step.provider} (${step.model}): circuit open`);
      continue;
    }
    const provider = registry.get(step.provider);
    if (!provider || !provider.isConfigured) {
      errors.push(`${step.provider} (${step.model}): not configured`);
      continue;
    }
    try {
      const text = await provider.complete(req, step.model);
      if (!text) {
        registry.recordFailure(circuitKey);
        errors.push(`${step.provider} (${step.model}): empty response`);
        continue;
      }
      registry.recordSuccess(circuitKey);
      return { text, provider: step.provider, model: step.model, errors };
    } catch (err: any) {
      registry.recordFailure(circuitKey);
      errors.push(`${step.provider} (${step.model}): ${err.message}`);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  throw new Error(`All providers failed: ${errors.join(' | ')}`);
}
