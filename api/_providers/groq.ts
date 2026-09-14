import type { AIProvider, AIProviderName, AIRequest } from './types.js';

const GROQ_MODELS = {
  gptOss120b: 'openai/gpt-oss-120b',
  gptOss20b: 'openai/gpt-oss-20b',
  qwen27b: 'qwen/qwen3.6-27b',
};

// Modelos que soportan JSON mode en Groq o alias heredados
const GROQ_JSON_OBJECT_MODELS = new Set<string>([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
]);

export class GroqProvider implements AIProvider {
  readonly name: AIProviderName = 'groq';
  private apiKey: string;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey || '';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  listModels(): string[] {
    return Object.values(GROQ_MODELS);
  }

  async complete(req: AIRequest, model: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('GROQ_API_KEY not configured');
    }

    // Mapear modelos llama heredados o inexistentes hacia gpt-oss-120b
    let effectiveModel = model;
    if (!this.listModels().includes(model) || model.includes('llama')) {
      effectiveModel = GROQ_MODELS.gptOss120b;
    }
    const maxTokens = req.maxTokens ?? (req.jsonMode ? 1500 : 1000);
    const temperature = req.temperature ?? 0.6;

    const body: any = {
      model: effectiveModel,
      messages: [
        ...(req.systemPrompt ? [{ role: 'system', content: req.systemPrompt }] : []),
        { role: 'user', content: req.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };
    // Solo enviar response_format si el modelo lo soporta y jsonMode está activo.
    if (req.jsonMode && GROQ_JSON_OBJECT_MODELS.has(effectiveModel)) {
      body.response_format = { type: 'json_object' };
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new Error(`Groq 429 (${effectiveModel}). Retry after: ${retryAfter || 'unknown'}s`);
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Groq ${response.status} (${effectiveModel}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
