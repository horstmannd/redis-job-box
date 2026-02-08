import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/jobbox';
const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');

const client = new Client({ connectionString: databaseUrl });

await client.connect();

await client.query(`
  create table if not exists schema_migrations (
    id text primary key,
    applied_at timestamptz not null default now()
  );
`);

const applied = await client.query('select id from schema_migrations order by id asc;');
const appliedIds = new Set(applied.rows.map((row) => row.id));

const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith('.sql'))
  .sort();

let appliedCount = 0;

for (const file of files) {
  if (appliedIds.has(file)) continue;

  const fullPath = path.join(migrationsDir, file);
  const sql = await fs.readFile(fullPath, 'utf8');

  await client.query('begin');
  try {
    await client.query(sql);
    await client.query('insert into schema_migrations (id) values ($1);', [file]);
    await client.query('commit');
    appliedCount += 1;
    console.log(`applied ${file}`);
  } catch (err) {
    await client.query('rollback');
    console.error(`failed ${file}`);
    throw err;
  }
}

console.log(`migrations complete (${appliedCount} applied)`);
await client.end();
