import { Redis } from '@upstash/redis';

// Inicializar de forma perezosa para evitar fallos si las variables no están
let redis: Redis | null = null;

function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    redis = new Redis({
      url,
      token,
    });
  }
  return redis;
}

/**
 * Función genérica de Rate Limit. 
 * Devuelve true si la petición DEBE permitirse, false si DEBE bloquearse.
 */
export async function checkRateLimit(
  identifier: string,
  limitLimit: number,
  windowSeconds: number
): Promise<boolean> {
  const client = getRedis();
  
  // Si no hay configuración de Redis (por ej. entorno local temporal), dejamos pasar
  // para no interrumpir el desarrollo, pero idealmente debe avisarse.
  if (!client) {
    console.warn(`⏳ Rate limit skipped for ${identifier} - Upstash Redis no está configurado`);
    return true; 
  }

  const key = `rate-limit:${identifier}`;
  
  try {
    const currentRequests = await client.incr(key);
    
    // Si es la primera petición de la ventana, establecemos el tiempo de expiración
    if (currentRequests === 1) {
      await client.expire(key, windowSeconds);
    }

    if (currentRequests > limitLimit) {
      return false; // Bloqueado
    }

    return true; // Permitido
  } catch (error) {
    console.error('Error in rateLimiter:', error);
    // En caso de fallo de conexión con Redis, permitimos la petición (Fail-open)
    return true;
  }
}
