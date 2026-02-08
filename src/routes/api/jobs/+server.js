import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { getRedis } from '$lib/redis';
import { getDb } from '$lib/db';

const QUEUE_KEY = 'jobs:queue';
const RECENT_KEY = 'jobs:recent';

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}));
  const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : null;
  const payload = body.payload ?? {};
  const maxRetries =
    typeof body.maxRetries === 'number' && Number.isFinite(body.maxRetries)
      ? Math.max(0, Math.floor(body.maxRetries))
      : 3;

  if (!type) {
    return json({ error: 'type is required' }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  const payloadSerialized = JSON.stringify(payload ?? null) ?? 'null';

  const job = {
    id,
    type,
    payload: payloadSerialized,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    retryCount: '0',
    maxRetries: String(maxRetries)
  };

  const redis = await getRedis();
  const db = getDb();

  await db.query(
    `insert into jobs (id, type, payload, status, created_at, updated_at, retry_count, max_retries)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, type, payload ?? null, 'queued', now, now, 0, maxRetries]
  );

  await redis.hSet(`job:${id}`, job);
  await redis.rPush(QUEUE_KEY, id);
  await redis.lPush(RECENT_KEY, id);
  await redis.lTrim(RECENT_KEY, 0, 49);
  await redis.publish(
    'jobs:events',
    JSON.stringify({
      id,
      type,
      status: 'queued',
      createdAt: now,
      retryCount: 0,
      maxRetries
    })
  );

  return json({ id, status: job.status });
}

export async function GET() {
  const db = getDb();
  const result = await db.query(
    `select id, type, payload, status, created_at, updated_at, retry_count, max_retries, last_error
     from jobs
     order by created_at desc
     limit 20`
  );

  if (result.rowCount === 0) {
    return json({ jobs: [] });
  }

  const jobs = result.rows.map((row) => ({
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: row.payload,
    retryCount: row.retry_count,
    maxRetries: row.max_retries,
    lastError: row.last_error
  }));

  return json({ jobs });
}
