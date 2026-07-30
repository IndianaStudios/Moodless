import { GoogleGenAI } from '@google/genai';
import type { AIProvider, AIProviderName, AIRequest } from './types.js';

const GEMMA_MODELS = {
  gemma4_12b: 'gemma-4-12b-it',
  gemma4_26b: 'gemma-4-26b-a4b-it',
  gemma4_31b: 'gemma-4-31b-it',
};

export class GeminiProvider implements AIProvider {
  readonly name: AIProviderName = 'gemini';
  private client: GoogleGenAI | null = null;

  constructor(apiKey: string | undefined) {
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  get isConfigured(): boolean {
    return this.client !== null;
  }

  listModels(): string[] {
    return Object.values(GEMMA_MODELS);
  }

  async complete(req: AIRequest, model: string): Promise<string> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY no configurada (define GEMINI_API_KEY o GOOGLE_API_KEY).');
    }

    const effectiveModel = this.listModels().includes(model) ? model : GEMMA_MODELS.gemma4_31b;
    const maxTokens = req.maxTokens ?? (req.jsonMode ? 2500 : 1200);
    const temperature = req.temperature ?? 0.7;

    // Estructura correcta para Gemini/Gemma con system_instruction.
    // Gemma (open-weight) sí soporta systemInstruction en la API de Gemini.
    const generationConfig: any = {
      temperature,
      maxOutputTokens: maxTokens,
      // Stop sequences defensivas: algunos modelos Gemma tienden a generar
      // bucles de sintaxis JSON. Cortamos cualquier marca obvia de loop.
      stopSequences: ['}}', '}}}', '"""', '```'],
    };
    if (req.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    try {
      const response = await this.client.models.generateContent({
        model: effectiveModel,
        contents: [{ role: 'user' as const, parts: [{ text: req.prompt }] }],
        config: generationConfig,
        ...(req.systemPrompt ? { systemInstruction: req.systemPrompt } : {}),
      } as any);

      const text = (response.text || '').trim();
      if (!text) {
        // Loggear el promptFinishReason para diagnóstico si vuelve a pasar
        const finishReason = (response as any)?.candidates?.[0]?.finishReason;
        const safetyRatings = (response as any)?.candidates?.[0]?.safetyRatings;
        console.warn(`[Gemini] empty response (${effectiveModel}) finishReason=${finishReason} safetyRatings=${JSON.stringify(safetyRatings)}`);
        throw new Error(`Gemma empty response (${effectiveModel}, finishReason=${finishReason || 'unknown'})`);
      }
      return text;
    } catch (err: any) {
      const message = err?.message || String(err);
      throw new Error(`Gemma ${effectiveModel}: ${message}`);
    }
  }
}