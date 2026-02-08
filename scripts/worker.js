import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from 'redis';
import { getDb } from './db.js';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
const queueKey = 'jobs:queue';

const client = createClient({ url });
client.on('error', (err) => console.error('Redis error', err));
const db = getDb();

let running = true;
process.on('SIGINT', () => {
  running = false;
});
process.on('SIGTERM', () => {
  running = false;
});

await client.connect();
console.log('Worker connected. Waiting for jobs...');

while (running) {
  const result = await client.brPop(queueKey, 5);
  if (!result) continue;

  const id = result.element;
  const now = new Date().toISOString();

  await client.hSet(`job:${id}`, {
    status: 'running',
    updatedAt: now
  });
  await db.query('update jobs set status = $1, updated_at = $2 where id = $3', [
    'running',
    now,
    id
  ]);

  // Simulate work
  await sleep(1500);

  await client.hSet(`job:${id}`, {
    status: 'completed',
    updatedAt: new Date().toISOString()
  });
  await db.query('update jobs set status = $1, updated_at = $2 where id = $3', [
    'completed',
    new Date().toISOString(),
    id
  ]);

  console.log(`Job ${id} completed`);
}

await client.quit();
console.log('Worker shutdown');
