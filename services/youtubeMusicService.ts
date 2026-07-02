import { auth } from './firebase';

export interface YouTubeTrack {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

/**
 * SERVICIO DE MÚSICA (YOUTUBE PROXY)
 * Ahora las búsquedas se realizan a través de nuestra propia API (/api/search-youtube)
 * para mantener la API Key protegida en el servidor.
 */
export const youtubeMusicService = {
  searchTracks: async (queries: string | string[]): Promise<YouTubeTrack[]> => {
    // Compatibilidad: si recibe un solo string, convertirlo a array
    const queryList = Array.isArray(queries) ? queries : [queries];

    try {
      // Obtener token de usuario para autenticar la petición al proxy
      const token = await auth.currentUser?.getIdToken();

      // Realizar todas las búsquedas en paralelo para máxima velocidad
      const searchPromises = queryList.map(async (query) => {
        const url = `/api/search-youtube?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });

        if (!response.ok) return null;
        return response.json();
      });

      const results = await Promise.all(searchPromises);
      const tracks: YouTubeTrack[] = [];
      const seenChannels = new Set<string>();

      results.forEach((data) => {
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          const channel = item.snippet.channelTitle;

          if (!seenChannels.has(channel)) {
            seenChannels.add(channel);
            tracks.push({
              id: item.id.videoId,
              title: item.snippet.title,
              channelTitle: channel,
              thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
            });
          }
        }
      });

      return tracks;
    } catch (error: any) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.warn("Búsqueda en YouTube falló por red (offline o servidor reiniciando).");
      } else {
        console.error("Error en búsqueda YouTube:", error);
      }
      return [];
    }
  },

  isConfigured: () => {
    // Siempre asumimos configurado porque el servidor maneja la clave
    return true;
  }
};
