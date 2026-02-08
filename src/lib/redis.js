import { createClient } from 'redis';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
let client;

export async function getRedis() {
  if (client?.isOpen) return client;

  client = createClient({ url });
  client.on('error', (err) => {
    console.error('Redis error', err);
  });

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
