export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt?: string;
  previewUrl?: string;
  externalUrl: string;
}

/**
 * CONFIGURACIÓN MAESTRA DE SPOTIFY
 * 1. Ve a https://developer.spotify.com/dashboard
 * 2. Crea una App y obtén tu Client ID y Client Secret
 * 3. Pégalos aquí abajo:
 */
const SPOTIFY_MASTER_CONFIG = {
  clientId: '', // <--- PEGA AQUÍ TU CLIENT ID
  clientSecret: '' // <--- PEGA AQUÍ TU CLIENT SECRET
};

export const spotifyService = {
  getAccessToken: async (): Promise<string | null> => {
    if (!SPOTIFY_MASTER_CONFIG.clientId || !SPOTIFY_MASTER_CONFIG.clientSecret) {
      console.warn("Spotify: Es necesario configurar las claves en services/spotifyService.ts");
      return null;
    }

    try {
      const authHeader = btoa(`${SPOTIFY_MASTER_CONFIG.clientId}:${SPOTIFY_MASTER_CONFIG.clientSecret}`);
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        body: 'grant_type=client_credentials'
      });
      
      if (!response.ok) throw new Error("Fallo en autenticación Spotify");
      
      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error("Error al obtener token de Spotify:", error);
      return null;
    }
  },

  searchTracks: async (query: string): Promise<SpotifyTrack[]> => {
    const token = await spotifyService.getAccessToken();
    if (!token) return [];

    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!data.tracks || !data.tracks.items) return [];

      return data.tracks.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        artist: item.artists[0]?.name || "Artista desconocido",
        albumArt: item.album.images[0]?.url,
        previewUrl: item.preview_url,
        externalUrl: item.external_urls.spotify
      }));
    } catch (error) {
      console.error("Error en búsqueda Spotify:", error);
      return [];
    }
  },

  isConfigured: () => {
    return !!(SPOTIFY_MASTER_CONFIG.clientId && SPOTIFY_MASTER_CONFIG.clientSecret);
  }
};