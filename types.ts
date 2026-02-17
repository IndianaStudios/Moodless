
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
  mascot?: string;
}
