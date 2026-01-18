
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
  searchTracks: async (query: string): Promise<YouTubeTrack[]> => {
    if (!YOUTUBE_API_KEY) {
      console.warn("YouTube Music: Es necesario configurar la clave API en services/youtubeMusicService.ts");
      return [];
    }

    try {
      // Optimizamos la búsqueda añadiendo "official audio" para obtener tracks más aptos para embeber
      // y limitamos los resultados a los más relevantes.
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " official audio")}&type=video&videoEmbeddable=true&maxResults=3&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (!data.items) return [];

      return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      }));
    } catch (error) {
      console.error("Error en búsqueda YouTube:", error);
      return [];
    }
  },

  isConfigured: () => {
    return !!YOUTUBE_API_KEY;
  }
};
