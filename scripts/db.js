import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jobbox';

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({ connectionString });
    pool.on('error', (err) => {
      console.error('Postgres pool error', err);
    });
  }

  return pool;
}
