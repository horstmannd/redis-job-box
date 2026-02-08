import { createClient } from 'redis';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
let client;

export function createRedisClient() {
  const newClient = createClient({ url });
  newClient.on('error', (err) => {
    console.error('Redis error', err);
  });
  return newClient;
}

export async function getRedis() {
  if (client?.isOpen) return client;

  client = createRedisClient();

  if (!client.isOpen) {
    await client.connect();
  }

  return client;
}
