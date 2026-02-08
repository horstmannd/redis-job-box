import { json } from '@sveltejs/kit';
import { getDb } from '$lib/db';

export async function GET({ params }) {
  const db = getDb();
  const result = await db.query(
    `select id, type, payload, status, created_at, updated_at
     from jobs
     where id = $1
     limit 1`,
    [params.id]
  );

  if (result.rowCount === 0) {
    return json({ error: 'not_found' }, { status: 404 });
  }

  const row = result.rows[0];

  return json({
    id: row.id,
    type: row.type,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    payload: row.payload
  });
}
