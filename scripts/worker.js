import { setTimeout as sleep } from 'node:timers/promises';
import { createClient } from 'redis';
import { getDb } from './db.js';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
const queueKey = 'jobs:queue';
const deadKey = 'jobs:dead';

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
  const jobKey = `job:${id}`;

  const jobData = await client.hGetAll(jobKey);
  const retryCount = Number(jobData.retryCount || jobData.retry_count || 0);
  const maxRetries = Number(jobData.maxRetries || jobData.max_retries || 3);

  await updateStatus(id, jobKey, 'running', now, retryCount, maxRetries);

  try {
    // Simulate work
    await sleep(1500);

    if (shouldFail(jobData)) {
      throw new Error('Simulated job failure');
    }

    const completedAt = new Date().toISOString();
    await updateStatus(id, jobKey, 'completed', completedAt, retryCount, maxRetries);
    console.log(`Job ${id} completed`);
  } catch (err) {
    const nextRetry = retryCount + 1;
    const failedAt = new Date().toISOString();
    const lastError = err?.message || 'Unknown error';

    if (nextRetry <= maxRetries) {
      await client.hSet(jobKey, {
        status: 'queued',
        updatedAt: failedAt,
        retryCount: String(nextRetry),
        lastError
      });
      await db.query(
        'update jobs set status = $1, updated_at = $2, retry_count = $3, last_error = $4 where id = $5',
        ['queued', failedAt, nextRetry, lastError, id]
      );
      await client.rPush(queueKey, id);
      await client.publish(
        'jobs:events',
        JSON.stringify({
          id,
          status: 'queued',
          updatedAt: failedAt,
          retryCount: nextRetry,
          maxRetries,
          lastError
        })
      );
    } else {
      await client.hSet(jobKey, {
        status: 'failed',
        updatedAt: failedAt,
        retryCount: String(nextRetry),
        lastError
      });
      await db.query(
        'update jobs set status = $1, updated_at = $2, retry_count = $3, last_error = $4 where id = $5',
        ['failed', failedAt, nextRetry, lastError, id]
      );
      await client.lPush(deadKey, id);
      await client.publish(
        'jobs:events',
        JSON.stringify({
          id,
          status: 'failed',
          updatedAt: failedAt,
          retryCount: nextRetry,
          maxRetries,
          lastError
        })
      );
    }
  }
}

await client.quit();
console.log('Worker shutdown');

async function updateStatus(id, jobKey, status, updatedAt, retryCount, maxRetries) {
  await client.hSet(jobKey, {
    status,
    updatedAt,
    retryCount: String(retryCount),
    maxRetries: String(maxRetries)
  });
  await db.query('update jobs set status = $1, updated_at = $2 where id = $3', [
    status,
    updatedAt,
    id
  ]);
  await client.publish(
    'jobs:events',
    JSON.stringify({
      id,
      status,
      updatedAt,
      retryCount,
      maxRetries
    })
  );
}

function shouldFail(jobData) {
  if (jobData.fail === 'true') return true;
  if (jobData.type && jobData.type.includes('fail')) return true;
  return false;
}
