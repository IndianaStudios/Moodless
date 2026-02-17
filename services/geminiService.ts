import { GoogleGenAI, Type } from "@google/genai";
import { MoodEntry, MoodCategory } from "../types";

export type GameType = 'PAINTER' | 'BREATH' | 'POP' | 'ORDER' | 'MIRROR';

export interface GameConfig {
  type: GameType;
  title: string;
  description: string;
  instruction: string;
  themeColor: string;
  intensity: number;
  mantra: string;
}

export interface MusicRecommendation {
  vibe: string;
  playlistName: string;
  searchQuery: string;
  groundingSources?: any[];
}

const cleanJsonResponse = (text: string) => {
  if (!text) return "{}";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const getCachedData = (key: string) => {
  const cached = localStorage.getItem(key);
  if (!cached) return null;
  try {
    const { data, timestamp, entryId, ttl } = JSON.parse(cached);
    const expireTime = ttl || 86400000;
    if (Date.now() - timestamp > expireTime) return null;
    return { data, entryId };
  } catch { return null; }
};

const setCachedData = (key: string, data: any, entryId: string, ttl: number = 86400000) => {
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now(), entryId, ttl }));
};

export const generateMoodReport = async (currentEntry: Omit<MoodEntry, 'id' | 'date' | 'report'>, history: MoodEntry[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analiza este estado emocional SAM: Valencia:${currentEntry.valence}, Activación:${currentEntry.arousal}, Dominancia:${currentEntry.dominance}. 
  Responde en JSON: {"title": "Nombre poético de la vibra", "explanation": "Breve explicación psicológica de 2 frases"}.`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return cleanJsonResponse(response.text || "");
  } catch {
    return JSON.stringify({ title: "Estado Calibrado", explanation: "Tu energía actual se encuentra en un punto de equilibrio receptivo." });
  }
};

export const getMoodGameConfig = async (mood: MoodCategory, valence: number, arousal: number, dominance: number, entryId: string): Promise<GameConfig> => {
  const cacheKey = `game_config_${entryId}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.entryId === entryId) return cached.data;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let type: GameType = 'MIRROR';
  if (valence <= 2) type = 'PAINTER';
  else if (arousal >= 4) type = 'BREATH';
  else if (valence >= 4 && arousal >= 3) type = 'POP';
  else if (dominance <= 2) type = 'ORDER';

  const prompt = `Crea un minijuego visual de meditación para alguien que se siente "${mood}". Tipo de juego: ${type}.
  Responde JSON: {"title": "Título", "description": "Frase inspiradora", "mantra": "Instrucción de respiración"}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const data = JSON.parse(cleanJsonResponse(response.text || "{}"));
    const config: GameConfig = {
      type,
      title: data.title || "Espacio Aura",
      description: data.description || "Conecta con tu pulso interior.",
      instruction: "Fluye con el movimiento.",
      themeColor: '#ffffff',
      intensity: arousal,
      mantra: data.mantra || "Respira y libera."
    };

    setCachedData(cacheKey, config, entryId);
    return config;
  } catch (error) {
    return { type, title: "Aura Zen", description: "Encuentra el equilibrio en el movimiento.", instruction: "Toca suavemente.", themeColor: '#ffffff', intensity: arousal, mantra: "Inhala paz." };
  }
};

export const getMoodMusicRecommendation = async (mood: MoodCategory, valence: number, arousal: number, entryId: string): Promise<MusicRecommendation> => {
  const cacheKey = `music_config_${entryId}`;
  const cached = getCachedData(cacheKey);
  if (cached && cached.entryId === entryId) return cached.data;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    Genera una búsqueda ideal para YouTube Music de un ARTISTA MUY CONOCIDO y FAMOSAMENTE GLOBAL.
    IMPORTANTE: El género musical DEBE ser una consecuencia natural del estado de ánimo (Valencia y Activación).
    No fuerces géneros irrelevantes. Prioriza la sincronización emocional.
    
    Busca HITS reconocibles que el usuario identifique de inmediato (ej. SIA, Queen, Taylor Swift, The Weeknd, Rosalia, etc.).
    
    Responde ÚNICAMENTE en JSON: 
    {
      "vibe": "Nombre creativo de la atmósfera (ej. 'Resiliencia Pura', 'Euforia Solar')",
      "playlistName": "Título del mood",
      "searchQuery": "Artista Famoso + Canción icónica (ej. 'Adele Hello', 'Avicii The Nights')"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    });

    const result = JSON.parse(cleanJsonResponse(response.text || "{}"));
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    const musicData = { ...result, groundingSources: grounding };
    // Reducción de caché a 4 horas (14400000 ms) para asegurar variedad durante el día
    setCachedData(cacheKey, musicData, entryId, 14400000);
    return musicData;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      vibe: "Pop Hits",
      playlistName: "Top Global",
      searchQuery: "Top Hits 2024"
    };
  }
};

export const getVibeRecommendation = async (mood: MoodCategory): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Escribe una recomendación de 8 palabras para alguien que siente ${mood}.`
    });
    return response.text || "Confía en tu proceso interno.";
  } catch {
    return "Siente el ritmo de tu respiración.";
  }
};