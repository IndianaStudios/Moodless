
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

export interface SoundtrackEntry {
  id?: string;
  date: string;
  moodCategory: MoodCategory;
  moodColor: string;
  moodLabel: string;
  vibeName: string;
  songs: {
    title: string;
    artist: string;
    youtubeId: string;
    thumbnail: string;
  }[];
  savedAt: string;
}

/**
 * Métricas diarias de salud. Se rellenan desde Health Connect (Android/iOS nativo)
 * o desde Google Fit REST (web/iOS-PWA). Campos nuevos son null si la fuente
 * no los emite (compatibilidad hacia atrás con registros antiguos).
 */
export interface DailyHealthMetrics {
  date: string;         // YYYY-MM-DD
  steps: number;        // Total pasos
  sleepMinutes: number; // Total minutos durmiendo (cualquier estado de sueño)
  avgHeartRate: number; // Pulsaciones promedio

  // === Métricas ampliadas (Fase 1: Health Connect) ===
  /** Minutos en sueño profundo. null si la fuente no distingue fases. */
  sleepDeepMinutes: number | null;
  /** Minutos en sueño REM. null si la fuente no distingue fases. */
  sleepRemMinutes: number | null;
  /** Minutos en sueño ligero. null si la fuente no distingue fases. */
  sleepLightMinutes: number | null;
  /** Minutos despierto dentro de la ventana de sueño. null si no aplica. */
  sleepAwakeMinutes: number | null;
  /** Frecuencia cardiaca en reposo (bpm). null si no hay dato. */
  restingHeartRate: number | null;
  /** Variabilidad de frecuencia cardiaca (RMSSD en ms). Proxy de estrés/recuperación. */
  hrvMs: number | null;
  /** Saturación de oxígeno en sangre promedio (%). null si no hay dato. */
  spo2Avg: number | null;

  syncedAt: string;     // ISO String de sincronización
  /** Fuente de los datos: 'health_connect' | 'health_kit' | 'fit_rest' */
  source?: 'health_connect' | 'health_kit' | 'fit_rest';
}


