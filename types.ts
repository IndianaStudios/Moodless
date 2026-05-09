
export enum MoodCategory {
  JOY = 'JOY',
  CALM = 'CALM',
  ANGER = 'ANGER',
  SADNESS = 'SADNESS',
  ANXIETY = 'ANXIETY',
  ENERGY = 'ENERGY',
  NEUTRAL = 'NEUTRAL'
}

export interface MoodEntry {
  id: string;
  date: string; // ISO String (date only YYYY-MM-DD)
  color: string;
  intensity: number; // General intensity derived from Arousal
  iconName: string;
  category: MoodCategory;
  report?: string;
  // SAM Dimensions (Scale 1-5)
  valence: number;
  arousal: number;
  dominance: number;
}

export interface ColorDefinition {
  category: MoodCategory;
  hex: string;
  label: string;
  secondary: string;
  moodBuddy?: string;
}

export interface EmotionalContextEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // Full ISO
  contexto: string[];
  emocion: string;
  energia: 'baja' | 'media' | 'alta';
  intensidad: number;
  userInput: string;
  aiResponse: string;
}
