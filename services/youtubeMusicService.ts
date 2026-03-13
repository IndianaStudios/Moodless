
export interface YouTubeTrack {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
}

/**
 * CONFIGURACIÓN MAESTRA DE YOUTUBE DATA API V3
 * 1. Ve a https://console.cloud.google.com/
 * 2. Habilita "YouTube Data API v3"
 * 3. Crea una Credencial (API Key) y pégala aquí:
 */
const YOUTUBE_API_KEY = 'AIzaSyDQh369SbmMGSGyLvE2ZrtWBzKKpHdmCrk';

export const youtubeMusicService = {
  searchTracks: async (queries: string | string[]): Promise<YouTubeTrack[]> => {
    if (!YOUTUBE_API_KEY) {
      console.warn("YouTube Music: Es necesario configurar la clave API en services/youtubeMusicService.ts");
      return [];
    }

    // Compatibilidad: si recibe un solo string, convertirlo a array
    const queryList = Array.isArray(queries) ? queries : [queries];

    try {
      const tracks: YouTubeTrack[] = [];
      const seenChannels = new Set<string>();

      for (const query of queryList) {
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&videoEmbeddable=true&maxResults=1&key=${YOUTUBE_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          const item = data.items[0];
          const channel = item.snippet.channelTitle;

          // Evitar duplicados del mismo canal/artista
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
      }

      return tracks;
    } catch (error) {
      console.error("Error en búsqueda YouTube:", error);
      return [];
    }
  },

  isConfigured: () => {
    return !!YOUTUBE_API_KEY;
  }
};
