# Redis Job Box

A small SvelteKit app for learning Redis-backed job queues, live updates, and durable job history.

## Local dev

1. `npm install`
2. `npm run dev -- --open`

## Docker

`docker compose up --build`

## Terraform (later)

Infra will live in `infra/terraform` and target Vercel + managed Postgres/Redis.
