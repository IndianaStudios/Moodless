import { MoodEntry, MoodCategory } from "../types";
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";

export type GameType = 'STARDUST' | 'SHATTER' | 'RIPPLES' | 'BREATH_JOURNEY';

export interface GameConfig {
  type: GameType;
  title: string;
  description: string;
  instruction: string;
  themeColor: string;
  intensity: number;
  mantra?: string;
}

export interface MusicRecommendation {
  vibe: string;
  playlistName: string;
  searchQueries: string[];
  searchQuery?: string; // Retrocompatibilidad con datos cacheados
  groundingSources?: any[];
}

export interface MoodPrediction {
  predictedCategory: string;
  confidence: number;
  pattern: string;
  probabilities: Record<string, number>;
  tip: string;
}

const cleanJsonResponse = (text: string) => {
  if (!text) return "{}";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  const parsed = JSON.parse(cached);
  if (Date.now() - parsed.timestamp > parsed.expiresIn) {
    localStorage.removeItem(key);
    return null;
  }
  return parsed;
};

const setCachedData = (key: string, data: any, entryId: string, expiresIn = 86400000) => {
  localStorage.setItem(key, JSON.stringify({
    data,
    entryId,
    timestamp: Date.now(),
    expiresIn
  }));
};


async function callAI(prompt: string, jsonMode: boolean = false): Promise<string> {
  // Esperar a que Firebase inicialice la sesión antes de pedir el token en un recargo rápido
  if (auth.authStateReady) await auth.authStateReady();
  
  const token = await auth.currentUser?.getIdToken();
  const response = await fetch('/api/generate-ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt, jsonMode }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`AI Request failed with status ${response.status}: ${errorData.error || 'Unknown Error'}`);
  }

  const data = await response.json();
  return data.result || '';
}

export const generateMoodReport = async (currentEntry: Omit<MoodEntry, 'id' | 'date' | 'report'>, history: MoodEntry[]): Promise<string> => {
  const prompt = `Analiza este estado emocional SAM: Valencia:${currentEntry.valence}, Activación:${currentEntry.arousal}, Dominancia:${currentEntry.dominance}. 
  Responde en JSON: {"title": "Nombre poético de la vibra", "explanation": "Breve explicación psicológica de 2 frases"}.`;
  try {
    const text = await callAI(prompt, true);
    return cleanJsonResponse(text);
  } catch {
    return JSON.stringify({ title: "Estado Calibrado", explanation: "Tu energía actual se encuentra en un punto de equilibrio receptivo." });
  }
};

export const getMoodGameConfig = async (mood: MoodCategory, valence: number, arousal: number, dominance: number, entryId: string): Promise<GameConfig> => {
  const cacheKey = `game_config_${entryId}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.entryId === entryId) return cached.data;

  // Lógica de mapeo para los nuevos minijuegos
  let type: GameType = 'RIPPLES'; // Default: calmo o neutral
  if (arousal >= 4 && (valence <= 2 || mood === MoodCategory.ANXIETY)) {
    type = 'BREATH_JOURNEY'; // Ansiedad o alta activación negativa extrema
  } else if (arousal >= 3 && valence <= 2) {
    type = 'SHATTER'; // Enojo o frustración
  } else if (valence >= 4) {
    type = 'STARDUST'; // Alegría o alta energía positiva
  }

  const prompt = `Crea la narrativa para un minijuego de meditación visual llamado ${type} para alguien que se siente "${mood}".
  El juego ${type} va de: ${
    type === 'STARDUST' ? 'Atrapar estrellas luminosas con el dedo para canalizar energía positiva.' :
    type === 'SHATTER' ? 'Romper cristales tocándolos para liberar tensión y frustración.' :
    type === 'RIPPLES' ? 'Crear ondas lentas en agua oscura para encontrar la calma.' :
    'Respiración guiada (4-7-8) con un mandala que crece y decrece.'
  }
  Responde JSON: {"title": "Título evocador (ej: Polvo Cósmico, Cristales Tensión)", "description": "1 frase inspiradora de por qué hacer esto", "mantra": "Instrucción de respiración corta"}`;

  try {
    const text = await callAI(prompt, true);
    const data = JSON.parse(cleanJsonResponse(text));
    const config: GameConfig = {
      type,
      title: data.title || "Espacio Aura",
      description: data.description || "Conecta con tu interior.",
      instruction: "Interactúa con el entorno.",
      themeColor: '#ffffff',
      intensity: arousal,
      mantra: data.mantra || "Respira y fluye."
    };

    setCachedData(cacheKey, config, entryId);
    return config;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return { type, title: "Aura Zen", description: "Encuentra el equilibrio en el movimiento.", instruction: "Toca suavemente.", themeColor: '#ffffff', intensity: arousal, mantra: "Inhala paz." };
  }
};

export const getMoodMusicRecommendation = async (mood: MoodCategory, valence: number, arousal: number, entryId: string): Promise<MusicRecommendation> => {
  const cacheKey = `music_config_${entryId}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.entryId === entryId) return cached.data;

  const hour = new Date().getHours();
  let timeContext = "generales";
  if (hour >= 5 && hour < 12) timeContext = "mañaneras, llenas de energía fresca";
  else if (hour >= 12 && hour < 18) timeContext = "de tarde, para acompañar el flujo del día";
  else if (hour >= 18 && hour < 23) timeContext = "de noche, relajantes o intensas";
  else timeContext = "nocturnas, profundas y atmosféricas";

  const varietySeed = Math.random().toString(36).substring(7);

  const prompt = `
    Basado en este estado emocional (Valencia: ${valence}, Activación: ${arousal}) y en un contexto de vibras ${timeContext}.
    Semilla de Variación: ${varietySeed}.

    Recomienda 5 CANCIONES DIFERENTES de ARTISTAS DIFERENTES que sean MUY CONOCIDOS y FAMOSOS GLOBALMENTE.
    IMPORTANTE: 
    - Cada canción DEBE ser de un artista DIFERENTE. Nunca repitas artista.
    - El género musical DEBE ser una consecuencia natural del estado de ánimo (Valencia y Activación).
    - Prioriza canciones icónicas que el usuario identifique de inmediato.
    - VARÍA los géneros: pop, rock, electrónica, R&B, indie, latin, etc.
    
    Responde ÚNICAMENTE en JSON: 
    {
      "vibe": "Nombre creativo de la atmósfera (ej. 'Resiliencia Pura', 'Euforia Solar')",
      "playlistName": "Título del mood",
      "searchQueries": [
        "Artista1 Cancion1",
        "Artista2 Cancion2",
        "Artista3 Cancion3",
        "Artista4 Cancion4",
        "Artista5 Cancion5"
      ]
    }
  `;

  try {
    const text = await callAI(prompt, true);
    const result = JSON.parse(cleanJsonResponse(text));
    // Compatibilidad: si viene searchQuery viejo, convertirlo a array
    if (result.searchQuery && !result.searchQueries) {
      result.searchQueries = [result.searchQuery];
    }
    const musicData = { ...result, groundingSources: [] };
    setCachedData(cacheKey, musicData, entryId, 14400000);
    return musicData;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return {
      vibe: "Pop Hits",
      playlistName: "Top Global",
      searchQueries: ["Adele Hello", "The Weeknd Blinding Lights", "Billie Eilish Bad Guy", "Dua Lipa Levitating", "Harry Styles As It Was"]
    };
  }
};

export const getVibeRecommendation = async (mood: MoodCategory): Promise<string> => {
  try {
    const text = await callAI(`Escribe una recomendación de 8 palabras para alguien que siente ${mood}.`);
    return text || "Confía en tu proceso interno.";
  } catch {
    return "Siente el ritmo de tu respiración.";
  }
};

const WEEKDAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getMoodPrediction = async (entries: MoodEntry[], forceRefresh = false): Promise<MoodPrediction | null> => {
  if (entries.length < 5 || !auth.currentUser) return null;

  const userId = auth.currentUser.uid;
  const todayStr = new Date().toISOString().split('T')[0];
  const cacheKey = `mood_prediction_${todayStr}`;

  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached.data;
  }

  // 1. Obtener predicción que se hizo para HOY (guardada ayer o antes)
  let feedbackContext = "";
  try {
    const prevPredDoc = await getDoc(doc(db, 'users', userId, 'predictions', todayStr));
    if (prevPredDoc.exists()) {
      const prevPred = prevPredDoc.data() as MoodPrediction;
      const todayEntry = entries.find(e => e.date === todayStr);
      
      if (todayEntry) {
        const wasCorrect = prevPred.predictedCategory === todayEntry.category;
        feedbackContext = `RETROALIMENTACIÓN: Para hoy habías predicho "${prevPred.predictedCategory}" (${prevPred.confidence}% confianza). 
        La realidad fue "${todayEntry.category}". Resultado: ${wasCorrect ? 'ACIERTO' : 'ERROR'}. 
        ${!wasCorrect ? 'Analiza por qué falló el patrón y ajusta tu lógica.' : 'El patrón se mantiene, sigue así.'}`;
      }
    }
  } catch (e) {
    console.warn("Error fetching feedback context", e);
  }

  // 2. Tomar los últimos registros para el historial
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const recent = sorted.slice(-20);

  const historyLines = recent.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    const weekday = WEEKDAYS_ES[d.getDay()];
    return `${e.date}(${weekday}):${e.category},V${e.valence},A${e.arousal},D${e.dominance}`;
  }).join('|');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const tomorrowDay = WEEKDAYS_ES[tomorrow.getDay()];

  const prompt = `Analiza estos registros SAM y predice el estado de mañana (${tomorrowDay}).
${feedbackContext}
Historial Real: ${historyLines}
Categorías: JOY,CALM,ANGER,SADNESS,ANXIETY,ENERGY,NEUTRAL.
JSON: {"predictedCategory":"CATEGORIA","confidence":0-100, "pattern":"Patrón detectado en 1 frase", "probabilities":{"JOY":N,"CALM":N,"ANGER":N,"SADNESS":N,"ANXIETY":N,"ENERGY":N,"NEUTRAL":N}, "tip":"Consejo breve"}. 
IMPORTANTE: Probabilidades 0-100 sumando 100. Considera la RETROALIMENTACIÓN si existe.`;

  try {
    const text = await callAI(prompt, true);
    const result: MoodPrediction = JSON.parse(cleanJsonResponse(text));

    const validCategories = ['JOY', 'CALM', 'ANGER', 'SADNESS', 'ANXIETY', 'ENERGY', 'NEUTRAL'];
    if (!validCategories.includes(result.predictedCategory)) {
      result.predictedCategory = 'NEUTRAL';
    }
    result.confidence = Math.min(100, Math.max(0, result.confidence || 50));

    // Normalización de seguridad
    if (result.probabilities) {
      const sum = Object.values(result.probabilities).reduce((a, b) => a + b, 0);
      if (sum > 0 && sum <= 1.1) {
        Object.keys(result.probabilities).forEach(k => result.probabilities[k] = Math.round(result.probabilities[k] * 100));
      }
    }

    // 3. Guardar predicción para MAÑANA en Firestore para el feedback del futuro
    await setDoc(doc(db, 'users', userId, 'predictions', tomorrowStr), result);

    setCachedData(cacheKey, result, todayStr, 43200000); // 12h cache
    return result;
  } catch (error) {
    console.error('Prediction AI Error:', error);
    return null;
  }
};