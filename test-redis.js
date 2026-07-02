import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.error('Missing Redis credentials:', { url, token });
  process.exit(1);
}

const client = new Redis({ url, token });

try {
  console.log('Testing Redis connection and incr...');
  const key = 'test-rate-limit-key';
  const val = await client.incr(key);
  console.log('Incr response:', val);
  const ttl = await client.expire(key, 10);
  console.log('Expire response:', ttl);
} catch (err) {
  console.error('Redis operation failed:', err);
}
