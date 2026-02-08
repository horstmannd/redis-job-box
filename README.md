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
  -d '{\"type\":\"send-email\",\"payload\":{\"to\":\"demo@example.com\"},\"maxRetries\":3}'
```

List recent jobs:

```bash
curl http://localhost:5173/api/jobs
```

## Retries + dead-letter queue

- Set `maxRetries` when enqueuing a job to control retries.
- Jobs that exceed `maxRetries` are marked `failed` and pushed to `jobs:dead` in Redis.
- To simulate a failure, enqueue a job with `"type": "fail-job"` or `"payload": { "fail": true }`.

## Terraform (later)

Infra will live in `infra/terraform` and target Vercel + managed Postgres/Redis.
