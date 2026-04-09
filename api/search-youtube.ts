import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAuth } from './_utils/verifyAuth';
import { checkRateLimit } from './_utils/rateLimit';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verificar autenticación (Solo usuarios logueados pueden buscar música)
  const authUser = await verifyAuth(req);
  if (!authUser || 'error' in authUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  // 2. Rate limiting (50 búsquedas por hora por usuario para proteger cuota)
  const isAllowed = await checkRateLimit(`youtube:${authUser.uid}`, 50, 3600);
  if (!isAllowed) {
    return res.status(429).json({ error: 'Límite de búsquedas alcanzado. Inténtalo más tarde.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + " official audio")}&type=video&videoEmbeddable=true&maxResults=1&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API Error:', data.error);
      return res.status(response.status).json({ error: 'Error from YouTube API' });
    }

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Search Proxy Error:', error.message);
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
}
