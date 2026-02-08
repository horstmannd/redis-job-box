import { json } from '@sveltejs/kit';
import { getRedis } from '$lib/redis';

export async function GET({ params }) {
  const redis = await getRedis();
  const data = await redis.hGetAll(`job:${params.id}`);

  if (!data.id) {
    return json({ error: 'not_found' }, { status: 404 });
  }

  return json({
    id: data.id,
    type: data.type,
    status: data.status,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    payload: safeJson(data.payload)
  });
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}
