import { GoogleGenAI } from '@google/genai';
import type { AIProvider, AIProviderName, AIRequest } from './types.js';

const GEMINI_MODELS = {
  flash38: 'gemini-3.8-flash',
  flash37: 'gemini-3.7-flash',
  flash35: 'gemini-3.5-flash',
  flashLatest: 'gemini-flash-latest',
  flashLite: 'gemini-2.5-flash-lite',
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
    return Object.values(GEMINI_MODELS);
  }

  async complete(req: AIRequest, model: string): Promise<string> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY no configurada (define GEMINI_API_KEY o GOOGLE_API_KEY).');
    }

    // Usar gemini-3.8-flash como estándar o mapear alias de Gemma obsoletos
    let effectiveModel = model;
    if (!this.listModels().includes(model) || model.startsWith('gemma') || model === 'gemini-3.6-flash') {
      effectiveModel = GEMINI_MODELS.flash38;
    }
    const maxTokens = req.maxTokens ?? (req.jsonMode ? 3000 : 3000);
    const temperature = req.temperature ?? 0.7;

    // Estructura correcta para Gemini/Gemma con system_instruction.
    // Gemma (open-weight) sí soporta systemInstruction en la API de Gemini.
    const generationConfig: any = {
      temperature,
      maxOutputTokens: maxTokens,
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