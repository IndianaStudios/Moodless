import type { AIProvider, AIProviderName, AIRequest } from './types.js';

const MISTRAL_MODELS = {
  smallLatest: 'mistral-small-latest',
  small: 'mistral-small',
  medium2508: 'mistral-medium-2508',
};

const SYSTEM_PROMPT = 'Eres un asistente creativo para una app de bienestar emocional llamada Moodless. Responde siempre en español.';

export class MistralProvider implements AIProvider {
  readonly name: AIProviderName = 'mistral';
  private apiKey: string;

  constructor(apiKey: string | undefined) {
    this.apiKey = apiKey || '';
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  listModels(): string[] {
    return Object.values(MISTRAL_MODELS);
  }

  async complete(req: AIRequest, model: string): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('MISTRAL_API_KEY not configured');
    }

    const effectiveModel = this.listModels().includes(model) ? model : MISTRAL_MODELS.smallLatest;
    const maxTokens = req.maxTokens ?? (req.jsonMode ? 1500 : 800);
    const temperature = req.temperature ?? 0.8;

    const body: any = {
      model: effectiveModel,
      messages: [
        { role: 'system', content: req.systemPrompt || SYSTEM_PROMPT },
        { role: 'user', content: req.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };
    if (req.jsonMode) body.response_format = { type: 'json_object' };

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new Error(`Mistral 429 (${effectiveModel}). Retry after: ${retryAfter || 'unknown'}s`);
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`Mistral ${response.status} (${effectiveModel}): ${err?.error?.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}
