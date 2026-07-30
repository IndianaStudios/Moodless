export type AIProviderName = 'gemini' | 'groq' | 'mistral';

export type TaskType =
  | 'mood_report'
  | 'mood_prediction'
  | 'emotional_insights'
  | 'context_analysis'
  | 'mood_buddy_interaction'
  | 'vibe_recommendation'
  | 'music_recommendation'
  | 'game_config';

export interface AIRequest {
  prompt: string;
  jsonMode?: boolean;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  task?: TaskType;
}

export interface AIResponse {
  text: string;
  provider: AIProviderName;
  model: string;
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly isConfigured: boolean;
  complete(req: AIRequest, model: string): Promise<string>;
  listModels(): string[];
}
