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


async function callAI(prompt: string, jsonMode: boolean = false, retries = 1): Promise<string> {
  // Esperar a que Firebase inicialice la sesión antes de pedir el token en un recargo rápido
  if (auth.authStateReady) await auth.authStateReady();
  
  for (let i = 0; i <= retries; i++) {
    try {
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
        // Si es un error de rate limit (429) y tenemos reintentos, esperamos un poco y reintentamos
        if (response.status === 429 && i < retries) {
          console.warn(`[AI] Rate limit hit, retrying in 0.5s... (${i + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        throw new Error(`AI Request failed with status ${response.status}: ${errorData.error || 'Unknown Error'}`);
      }

      const data = await response.json();
      return data.result || '';
    } catch (error) {
      if (i === retries) throw error;
      console.warn(`[AI] Request failed, retrying in 0.5s... (${i + 1}/${retries})`, error);
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return '';
}

export const generateMoodReport = async (currentEntry: Omit<MoodEntry, 'id' | 'date' | 'report'>, history: MoodEntry[], context?: string): Promise<string> => {
  const prompt = `Actúa como un experto en psicología emocional para la app Moodless.
  Analiza este estado emocional SAM: Valencia:${currentEntry.valence}, Activación:${currentEntry.arousal}, Dominancia:${currentEntry.dominance}.
  
  CONTEXTO ADICIONAL (lo que el usuario ha contado):
  "${context || 'No hay contexto adicional.'}"
  
  Debes generar un informe que combine los datos técnicos SAM con el contexto real del usuario.
  Responde en JSON estricto: 
  {
    "title": "Nombre claro y directo del estado", 
    "explanation": "Explicación breve (máximo 2 frases) que relacione sus valores SAM con lo que ha contado, con un tono empático y humano."
  }`;
  try {
    const text = await callAI(prompt, true);
    return cleanJsonResponse(text);
  } catch {
    return JSON.stringify({ title: "Estado Estable", explanation: "Tus niveles de energía y ánimo se encuentran en un punto de equilibrio tranquilo." });
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

export const getEmotionalInsights = async (allLogs: string): Promise<any> => {
  const prompt = `Actúa como un analista de datos psicólogo. Analiza el siguiente historial de registros emocionales del usuario:
  
  ${allLogs}
  
  Tu objetivo es encontrar 3 "insights" o patrones claros y sorprendentes. 
  Ejemplo: "Te sientes más feliz cuando hablas de deporte", "Tu ansiedad sube los domingos", etc.
  
  Formato JSON estricto:
  {
    "insights": [
      { "title": "Título corto", "description": "Descripción del patrón detectado", "confidence": number (1-100) }
    ],
    "summary": "Resumen general de 1 frase sobre su estado actual",
    "cloudContexts": string[] (Las 10 palabras/contextos más repetidos)
  }`;

  try {
    const text = await callAI(prompt, true);
    return JSON.parse(cleanJsonResponse(text));
  } catch (error) {
    console.error("Insights Generation Error:", error);
    return { insights: [], summary: "Sigue registrando tus días para que pueda encontrar patrones.", cloudContexts: [] };
  }
};

export const getMoodBuddyInteraction = async (mood: string, pastMemory: string): Promise<any> => {
  const prompt = `Eres MoodBuddy, el compañero empático de la app Moodless. Tu personalidad es cálida, curiosa, un poco juguetona y siempre positiva.
  
  CONTEXTO ACTUAL:
  El usuario se siente: ${mood}
  Memoria de chats recientes: ${pastMemory || 'Primera vez que hablamos hoy.'}

  Debes:
  1. Saludar de forma muy breve (máximo 12 palabras). 
  2. NO repitas constantemente el nombre de la emoción. Sé natural.
  3. Menciona algo de su memoria de forma casual si encaja, o simplemente dale ánimos.
  4. Proponer una "Misión Diaria" (una acción física o mental pequeña, creativa y fácil) para hoy. Evita misiones genéricas como "respira profundo".
  
  Formato JSON estricto:
  {
    "greeting": "string",
    "mission": "string"
  }`;

  try {
    const text = await callAI(prompt, true);
    const parsed = JSON.parse(cleanJsonResponse(text));
    if (!parsed.greeting || !parsed.mission) throw new Error("Incomplete AI response");
    return parsed;
  } catch (error) {
    console.error("MoodBuddy Interaction Error:", error);
    return { 
      greeting: "¡Hola! Soy MoodBuddy. Qué alegría verte por aquí hoy.", 
      mission: "Haz una pausa de 1 minuto para estirarte y sonreír." 
    };
  }
};

export const analyzeEmotionalContext = async (userInput: string, chatHistory: string = '', pastContext: string = ''): Promise<any> => {
  // Limitar historial para no exceder los límites máximos de la arquitectura (30k)
  const limitedHistory = chatHistory.length > 25000 ? '...' + chatHistory.slice(-25000) : chatHistory;

  const prompt = `Actúa como un experto en psicología y análisis de contexto para la app Moodless.
  
  MEMORIA DE DÍAS PASADOS (Resumen de lo que el usuario ha contado anteriormente):
  ${pastContext || 'No hay registros anteriores.'}

  Historial de la conversación actual:
  ${limitedHistory}

  El usuario dice ahora: "${userInput}"
  
  Debes:
  1. Extraer un array de contextos (ej: ['trabajo', 'familia', 'estudio', 'amigos', 'pareja', 'salud', 'ocio', 'soledad', 'ejercicio', 'alimentación']).
  2. Si el contexto es AMBIGUO y no estás seguro de la relación (por ejemplo, habla de una persona pero no sabes si es su pareja o un amigo), DEBES pedir aclaración al usuario.
  3. Identificar la emoción predominante (ej: 'estrés', 'tristeza', 'calma', 'felicidad', 'miedo', 'ira', 'frustración', 'entusiasmo').
  4. Identificar el nivel de energía percibido ('baja', 'media', 'alta').
  5. Identificar la intensidad emocional (número del 1 al 10).
  6. Si "necesita_aclaracion" es true, tu "respuesta" debe ser la pregunta para aclarar la duda de forma natural. Si es false, responde en 1-2 frases cortas y empáticas sugiriendo una posible relación causa-efecto si aplica.
  
  Formato JSON estricto:
  {
    "contexto": string[],
    "emocion": string,
    "energia": "baja" | "media" | "alta",
    "intensidad": number,
    "respuesta": string,
    "necesita_aclaracion": boolean
  }`;

  try {
    const text = await callAI(prompt, true);
    return JSON.parse(cleanJsonResponse(text));
  } catch (error) {
    console.error("Context Analysis Error:", error);
    throw error;
  }
};