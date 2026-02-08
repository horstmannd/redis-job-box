# Redis Job Box

A small SvelteKit app for learning Redis-backed job queues, live updates, and durable job history.

## Local dev

1. `npm install`
2. `npm run dev -- --open`
3. In another terminal: `npm run worker`
4. Run migrations: `npm run migrate`

## Docker

`docker compose up --build`

Run migrations (once the database is up):

```bash
docker compose run --rm app npm run migrate
```

## API quickstart

Queue a job:

```bash
curl -X POST http://localhost:5173/api/jobs \\
  -H \"Content-Type: application/json\" \\
  -d '{\"type\":\"send-email\",\"payload\":{\"to\":\"demo@example.com\"}}'
```

List recent jobs:

```bash
curl http://localhost:5173/api/jobs
```

## Terraform (later)

Infra will live in `infra/terraform` and target Vercel + managed Postgres/Redis.
