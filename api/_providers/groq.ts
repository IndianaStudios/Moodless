import type { AIProvider, AIProviderName, AIRequest } from './types.js';

const GROQ_MODELS = {
  llama70b: 'llama-3.3-70b-versatile',
  llama8b: 'llama-3.1-8b-instant',
  mixtral: 'mixtral-8x7b-32768',
  gemma9b: 'gemma2-9b-it',
  gptOss120b: 'openai/gpt-oss-120b',
};

// Solo estos modelos soportan `response_format: { type: "json_object" }` en Groq.
// El resto devolvería error 400 si se lo enviamos. Para esos, el JSON se obtiene
// inline y se limpia en el frontend con `cleanJsonResponse`.
const GROQ_JSON_OBJECT_MODELS = new Set<string>([
  GROQ_MODELS.llama70b,
  // agrega aquí otros modelos Groq compatibles si los incorporas en el futuro
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

    const effectiveModel = this.listModels().includes(model) ? model : GROQ_MODELS.llama70b;
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
