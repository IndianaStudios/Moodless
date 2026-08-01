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
  // 1. Eliminar fences de markdown (```json ... ```)
  let cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 2. Si el modelo devolvió JSON inline dentro de un bloque explicativo,
  //    intentar extraer el primer objeto JSON válido.
  //    Esto cubre modelos sin `response_format: json_object` (ej. llama-3.1-8b-instant)
  //    que a veces envuelven el JSON en frases tipo "Aquí está el JSON: {...}".
  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    let candidate = -1;
    if (firstBrace !== -1 && firstBracket !== -1) {
      candidate = Math.min(firstBrace, firstBracket);
    } else if (firstBrace !== -1) {
      candidate = firstBrace;
    } else if (firstBracket !== -1) {
      candidate = firstBracket;
    }
    if (candidate !== -1) {
      cleaned = cleaned.slice(candidate).trim();
    }
  }

  // 3. Si aún tiene texto después del último }, ], descartar la cola.
  const lastClose = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
  if (lastClose !== -1 && lastClose < cleaned.length - 1) {
    cleaned = cleaned.slice(0, lastClose + 1).trim();
  }

  return cleaned;
};

const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    // Migración: si la entrada viene del formato viejo (expiresIn en ms desde timestamp),
    // la convertimos a expiresAt absoluto. Las del nuevo formato ya tienen expiresAt.
    if (typeof parsed.expiresAt !== 'number' && typeof parsed.expiresIn === 'number' && typeof parsed.timestamp === 'number') {
      parsed.expiresAt = parsed.timestamp + parsed.expiresIn;
    }
    // expiresAt es un timestamp absoluto en ms. Si Date.now() lo supera,
    // el caché está expirado.
    if (typeof parsed.expiresAt === 'number' && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

/**
 * Calcula el timestamp (ms) de las 00:00:00 del día siguiente en hora local.
 * Útil para caches que deben expirar al iniciar el nuevo día.
 */
const nextDayMidnight = (): number => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.getTime();
};

const setCachedData = (
  key: string,
  data: any,
  entryId: string,
  expiresInOrAt: number = 86400000
) => {
  // Si el valor es razonable como duración TTL (< 30 días en ms),
  // lo interpretamos como duración desde ahora. Si es mucho mayor,
  // lo interpretamos como timestamp absoluto (expiresAt).
  // Para forzar el modo "hasta medianoche del día siguiente", pasamos
  // `expiresAt: nextDayMidnight()` directamente.
  const isTimestamp = expiresInOrAt > 30 * 86400000;
  const expiresAt = isTimestamp
    ? expiresInOrAt
    : Date.now() + expiresInOrAt;

  localStorage.setItem(key, JSON.stringify({
    data,
    entryId,
    timestamp: Date.now(),
    expiresAt,
  }));
};

/**
 * Helper para caches que deben expirar al iniciar el día siguiente (medianoche local).
 */
const setCachedDataUntilMidnight = (key: string, data: any, entryId: string) => {
  setCachedData(key, data, entryId, nextDayMidnight());
};

/**
 * Purga todas las cachés de IA relacionadas con un aura que NO coincida con
 * el `currentEntryId` (la vibe de hoy). Pensado para llamarse:
 *   1. Al iniciar la app / login → elimina restos del día anterior
 *   2. Cuando el usuario registra una nueva vibe → limpia la del día previo
 *
 * Después de llamar a esto, getMoodMusicRecommendation/getMoodGameConfig
 * regenerarán desde cero la próxima vez que se pidan (en la carga de Explora).
 */
export const purgeStaleAuraCaches = (currentEntryId: string): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const todayEntryId = currentEntryId;
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      const isAuraCache =
        key.startsWith('music_config_') ||
        key.startsWith('game_config_');
      if (!isAuraCache) continue;
      // Si la cache no es de la entryId actual → borrar.
      if (key !== `music_config_${todayEntryId}` && key !== `game_config_${todayEntryId}`) {
        localStorage.removeItem(key);
      }
    }
  } catch (e) {
    console.warn('purgeStaleAuraCaches failed:', e);
  }
};


async function callAI(prompt: string, jsonMode: boolean = false, retries = 1, task?: string, systemPrompt?: string, maxTokens?: number, temperature?: number, model?: string): Promise<string> {
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
        body: JSON.stringify({ prompt, jsonMode, task, systemPrompt, maxTokens, temperature, model }),
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
    } catch (error: any) {
      if (i === retries) {
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          console.warn("[AI] Request failed due to network error (Failed to fetch).");
        }
        throw error;
      }
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
    const text = await callAI(prompt, true, 1, 'mood_report');
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
    const text = await callAI(prompt, true, 1, 'game_config');
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
    const text = await callAI(
      prompt,
      true,
      1,
      'music_recommendation',
      undefined,
      800,
      0.8,
      'llama-3.1-8b-instant'
    );
    const result = JSON.parse(cleanJsonResponse(text));
    // Compatibilidad: si viene searchQuery viejo, convertirlo a array
    if (result.searchQuery && !result.searchQueries) {
      result.searchQueries = [result.searchQuery];
    }
    const musicData = { ...result, groundingSources: [] };
    // La caché de música NUNCA expira por tiempo. Solo se purga explícitamente
    // cuando el usuario registra una nueva vibe (ver MoodCanvas.handleSave
    // → purgeStaleAuraCaches) o cuando purgaStaleAuraCaches se ejecuta al
    // iniciar la app (ver App.tsx).
    setCachedData(cacheKey, musicData, entryId, Number.MAX_SAFE_INTEGER);
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
    const text = await callAI(`Escribe una recomendación de 8 palabras para alguien que siente ${mood}.`, false, 1, 'vibe_recommendation');
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

  const todayEntry = entries.find(e => e.date === todayStr);
  const todayMoodLabel = todayEntry ? todayEntry.category : null;

  const prompt = `Eres un analista emocional experto. Analiza el historial de registros SAM del usuario y predice su estado emocional para mañana (${tomorrowDay}).

${feedbackContext}

HISTORIAL RECIENTE (fecha(día):categoría,Valence,Arousal,Dominance):
${historyLines}

${todayMoodLabel ? `HOY (${todayStr}) el usuario ha registrado: ${todayMoodLabel}. Ten esto en cuenta como el dato MÁS reciente.` : 'El usuario aún no ha registrado su estado de hoy.'}

CATEGORÍAS VÁLIDAS (usa SOLO estas en predictedCategory): JOY, CALM, ANGER, SADNESS, ANXIETY, ENERGY, NEUTRAL.

TRADUCCIONES para el campo "pattern" (OBLIGATORIO usar español):
- JOY = Alegría
- CALM = Calma
- ANGER = Enfado
- SADNESS = Tristeza
- ANXIETY = Ansiedad
- ENERGY = Energía
- NEUTRAL = Neutral

REGLAS:
1. El campo "predictedCategory" debe ser una de las 7 categorías en inglés (JOY, CALM, etc.).
2. El campo "pattern" debe estar COMPLETAMENTE EN ESPAÑOL. Usa los nombres traducidos de arriba. Ejemplo: "Tras varios días de Alegría, es probable que mañana mantengas esa tendencia positiva".
3. El campo "tip" debe ser un consejo breve y útil en español.
4. Las probabilidades deben sumar 100.
5. NO inventes datos. Basa tu análisis SOLO en el historial proporcionado.

Responde SOLO con JSON:
{"predictedCategory":"CATEGORIA","confidence":0-100,"pattern":"Patrón detectado en 1 frase EN ESPAÑOL","probabilities":{"JOY":N,"CALM":N,"ANGER":N,"SADNESS":N,"ANXIETY":N,"ENERGY":N,"NEUTRAL":N},"tip":"Consejo breve en español"}`;

  try {
    const text = await callAI(
      prompt,
      true,
      1,
      'mood_prediction',
      undefined,
      800,
      0.3,
      'gemma-4-12b-it'
    );
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
  if (!auth.currentUser) return null;
  const userId = auth.currentUser.uid;

  // Simple hash function to detect if logs have changed
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  const logHash = hashString(allLogs);
  
  // 1. Comprobar si ya existe en Firebase para este mismo historial (hash)
  try {
    const docRef = doc(db, 'users', userId, 'insights', 'latest');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const dbData = docSnap.data();
      if (dbData.logHash === logHash) {
        return dbData.insightsData;
      }
    }
  } catch (error) {
    console.error("Error reading insights from Firebase", error);
  }

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
    "cloudContexts": ["Temática 1", "Temática 2"] // Array de 5 a 10 temáticas o actividades clave (ej. "Familia", "Trabajo", "Deporte", "Pareja"). NUNCA uses adverbios, adjetivos comunes, verbos sueltos ni conectores (evita "muy", "hace", "bueno", "poco").
  }`;

  try {
    const text = await callAI(
      prompt,
      true,
      1,
      'emotional_insights',
      undefined,
      1500,
      0.6,
      'gemma-4-12b-it'
    );
    const result = JSON.parse(cleanJsonResponse(text));
    
    // 2. Guardar en Firebase para persistencia real
    try {
      await setDoc(doc(db, 'users', userId, 'insights', 'latest'), {
        logHash,
        insightsData: result,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error saving insights to Firebase", e);
    }
    
    return result;
  } catch (error) {
    console.error("Insights Generation Error:", error);
    return { insights: [], summary: "Sigue registrando tus días para que pueda encontrar patrones.", cloudContexts: [] };
  }
};

export const getMoodBuddyInteraction = async (mood: string, pastMemory: string): Promise<any> => {
  const today = new Date();
  const dayName = WEEKDAYS_ES[today.getDay()];
  const dateStr = today.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const prompt = `Eres MoodBuddy, el compañero empático de la app Moodless. Tu personalidad es cálida, curiosa, un poco juguetona y siempre positiva.
  
  CONTEXTO TEMPORAL:
  Hoy es ${dayName}, ${dateStr}.
  
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
    const text = await callAI(
      prompt,
      true,
      1,
      'mood_buddy_interaction',
      undefined,
      512,
      0.7,
      'gemma-4-12b-it'
    );
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

  const prompt = `Eres un experto en psicología emocional que trabaja para la app Moodless. Tu tarea es analizar lo que el usuario cuenta y devolver SOLO un JSON estructurado.

CONTEXTO DEL DÍA (resumen de lo que el usuario ya ha contado en días anteriores en esta app):
${pastContext || 'No hay registros de días anteriores todavía.'}

HISTORIAL DE ESTA CONVERSACIÓN (turnos previos en orden cronológico):
${limitedHistory || 'Es el primer turno de esta conversación; no hay historial previo.'}

NUEVA INTERVENCIÓN DEL USUARIO (lo que acaba de escribir ahora):
"${userInput}"

REGLAS DE COHERENCIA IMPORTANTES:
- NO repitas preguntas que ya hayas hecho en turnos anteriores del historial. Si ya pediste aclaración sobre algo, no lo pidas de nuevo a menos que el usuario haya dado información nueva que siga siendo ambigua.
- Mantén el foco en entender la intervención ACTUAL del usuario usando el contexto previo.
- Si en el historial ya identificaste un contexto claro (pareja, trabajo, etc.), no lo cuestiones de nuevo.
- Las preguntas de aclaración solo se permiten cuando el usuario introduce información genuinamente nueva y ambigua.

INSTRUCCIONES DE ANÁLISIS:
1. Extrae un array de contextos presentes en el mensaje (ejemplos válidos: ['trabajo', 'familia', 'estudio', 'amigos', 'pareja', 'salud', 'ocio', 'soledad', 'ejercicio', 'alimentación', 'sueño', 'dinero', 'creatividad', 'identidad']).
2. Identifica la emoción predominante (ejemplos válidos: 'estrés', 'tristeza', 'calma', 'felicidad', 'miedo', 'ira', 'frustración', 'entusiasmo', 'ansiedad', 'agotamiento', 'nostalgia', 'gratitud', 'soledad', 'euforia', 'apatía').
3. Identifica el nivel de energía percibido: 'baja', 'media' o 'alta'.
4. Identifica la intensidad emocional como número entero del 1 al 10.
5. DECISIÓN SOBRE PREGUNTAR (campo "necesita_aclaracion"):
   - Puedes hacer UNA pregunta de seguimiento empática si crees que te ayudaría a entender mejor al usuario. Pregunta cuando:
     * Hay un detalle vago que nombrarías concretamente (ej: "esa persona" → ¿quién?).
     * El usuario menciona algo nuevo que merece exploración (ej: "estoy bien... creo" → ¿qué quieres decir con "creo"?).
     * Detectas carga emocional alta (intensidad >= 7) y quieres validar o profundizar.
     * El usuario expresa una emoción contradictoria (ej: "estoy feliz pero cansado") y quieres entender.
   - NO preguntes si:
     * El contexto ya está claro en el historial.
     * Ya hiciste una pregunta similar en turnos anteriores y el usuario no la respondió.
     * El usuario solo está desahogándose sin esperar más preguntas.
   - Si decides preguntar: "necesita_aclaracion"=true y "respuesta" debe ser UNA pregunta empática corta y específica.
   - Si NO preguntas: "necesita_aclaracion"=false y "respuesta" debe ser 1-2 frases cortas y empáticas que reconozcan el contexto del usuario.

FORMATO JSON ESTRICTO (sin texto adicional, sin markdown, sin comillas triples):
{
  "contexto": string[],
  "emocion": string,
  "energia": "baja" | "media" | "alta",
  "intensidad": number,
  "respuesta": string,
  "necesita_aclaracion": boolean
}`;

  try {
    const text = await callAI(
      prompt,
      true,
      2,
      'context_analysis',
      undefined,
      1000,
      0.5,
      'openai/gpt-oss-120b'
    );
    return JSON.parse(cleanJsonResponse(text));
  } catch (error) {
    console.error("Context Analysis Error:", error);
    throw error;
  }
};

export const summarizeChatHistory = async (turnsText: string): Promise<string> => {
  if (!turnsText || turnsText.trim().length < 200) {
    // Historial muy corto: no merece resumir; devolvemos lo que hay.
    return turnsText.trim();
  }

  const prompt = `Eres un asistente que resume conversaciones de apoyo emocional para preservar contexto entre turnos.

OBJETIVO:
Genera un resumen COMPACTO y OPERATIVO de la siguiente conversación entre un usuario y un asistente emocional. El resumen se inyectará en el prompt de otra IA que debe continuar la conversación sin repetir preguntas ya hechas y sin perder el hilo temático.

REGLAS ESTRICTAS:
- Máximo 700 palabras. Prioriza densidad sobre exhaustividad.
- NO inventes información que no esté en los turnos.
- Identifica y lista: temas centrales discutidos, emociones predominantes detectadas, hechos clave revelados por el usuario (nombres, situaciones, relaciones), preguntas de aclaración que el asistente YA hizo y a las que el usuario respondió, y el estado emocional actual.
- Usa formato estructurado con bullets cortos y secciones claras.
- Mantén en español el mismo tono empático (no resumas el tono, solo el contenido).
- Si el usuario reveló algo importante (ej: "soy desarrollador en una startup"), consérvalo literalmente entre comillas.
- NO uses markdown complejo (sin headings de nivel 3+). Usa bullets simples y líneas cortas.

CONVERSACIÓN A RESUMIR:
${turnsText}

RESUMEN ESTRUCTURADO:`;

  try {
    const text = await callAI(
      prompt,
      false,
      1,
      'context_summarization',
      undefined,
      900,
      0.3,
      'openai/gpt-oss-120b'
    );
    return text.trim();
  } catch (error) {
    console.error('[summarizeChatHistory] Error:', error);
    // Si falla el resumen, devolvemos los turnos crudos como fallback.
    return turnsText;
  }
};