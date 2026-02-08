import { json } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { getRedis } from '$lib/redis';

const QUEUE_KEY = 'jobs:queue';
const RECENT_KEY = 'jobs:recent';

export async function POST({ request }) {
  const body = await request.json().catch(() => ({}));
  const type = typeof body.type === 'string' && body.type.trim() ? body.type.trim() : null;
  const payload = body.payload ?? {};

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
    updatedAt: now
  };

  const redis = await getRedis();
  await redis.hSet(`job:${id}`, job);
  await redis.rPush(QUEUE_KEY, id);
  await redis.lPush(RECENT_KEY, id);
  await redis.lTrim(RECENT_KEY, 0, 49);

  return json({ id, status: job.status });
}

export async function GET() {
  const redis = await getRedis();
  const ids = await redis.lRange(RECENT_KEY, 0, 19);

  if (ids.length === 0) {
    return json({ jobs: [] });
  }

  const pipeline = redis.multi();
  ids.forEach((id) => pipeline.hGetAll(`job:${id}`));
  const results = (await pipeline.exec()) || [];

  const jobs = results
    .map((entry, index) => {
      const data = entry || {};
      if (!data.id) {
        return { id: ids[index], status: 'unknown' };
      }

      return {
        id: data.id,
        type: data.type,
        status: data.status,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        payload: safeJson(data.payload)
      };
    })
    .filter(Boolean);

  return json({ jobs });
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
