# ContractLens

ContractLens is an API reliability and contract-intelligence workspace for
engineering teams. It monitors critical API checks, highlights contract drift,
groups incidents with evidence, and provides an AI-assisted starting point for
diagnosis.

## What it includes

- Reliability overview with uptime, latency, error-rate, service, and incident
  signal
- Monitored service catalog with ownership and health status
- Synthetic API checks with recent run history
- Incident creation, filtering, detail timelines, and resolution workflow
- Evidence-backed AI incident diagnosis using an OpenAI-compatible provider
- PostgreSQL persistence through Drizzle ORM
- OpenAPI-first API contracts with generated Zod schemas and React hooks

## Stack

- React, Vite, TypeScript, Tailwind CSS
- Express 5 API server
- PostgreSQL, Drizzle ORM, and drizzle-zod
- OpenAPI 3.1 with Orval-generated client code
- OpenAI SDK for diagnosis, including OpenAI-compatible Groq endpoints
- pnpm workspace monorepo

## Run locally

Prerequisites: Node.js 24, pnpm, and PostgreSQL.

```bash
pnpm install
export DATABASE_URL="postgresql://..."
pnpm --filter @workspace/db run push
PORT=5000 pnpm --filter @workspace/api-server run dev
```

In a second shell, start the web app:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/contract-lens run dev
```

The API is available at `http://localhost:5000/api` and the web app at
`http://localhost:5173`.

To enable AI diagnosis, set `OPENAI_API_KEY` in the environment. Keep this
value in a secret manager; do not commit it to the repository. Standard
OpenAI keys use `gpt-5-mini`. Groq-compatible `gsk_` keys use the OpenAI
compatible Groq endpoint and `openai/gpt-oss-20b`.

## Useful commands

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

## API surface

The source-of-truth contract is
`lib/api-spec/openapi.yaml`. Main routes are:

- `GET /api/healthz`
- `GET /api/dashboard`
- `GET|POST /api/services`
- `GET|PATCH /api/services/:serviceId`
- `GET|POST /api/checks`
- `GET|POST /api/checks/:checkId`
- `GET|POST /api/incidents`
- `GET|PATCH /api/incidents/:incidentId`
- `POST /api/incidents/:incidentId/diagnose`

The first request to the dashboard, service, check, or incident routes seeds
demo data when the database is empty. This makes a new development database
immediately usable; replace the seed module with an ingestion pipeline for a
production data source.

## Deploy to Render

The repository includes `render.yaml` for a two-service Render deployment:

1. `contract-lens-api`, a Node web service running the Express API
2. `contract-lens-web`, a static site built from the Vite frontend
3. `contract-lens-db`, the PostgreSQL database connected to the API

Create a Render Blueprint from the repository and provide `OPENAI_API_KEY`
when prompted. Render supplies `DATABASE_URL` from the managed database and
`PORT` to the API service. The API health check is
`/api/healthz`.

For production, set the static site’s `VITE_API_BASE_URL` to the deployed API
origin, for example `https://contract-lens-api.onrender.com`, without a
trailing `/api`. The generated client appends `/api/...` to that origin. When
the variable is omitted, requests stay relative so the Replit preview and
same-origin deployments continue to work.

## Project map

- `artifacts/contract-lens` — React/Vite product UI
- `artifacts/api-server` — Express API and AI diagnosis route
- `lib/api-spec` — OpenAPI source contract
- `lib/api-client-react` — generated React Query hooks
- `lib/api-zod` — generated request/response schemas
- `lib/db` — Drizzle schema and database client

## Security notes

Never commit `OPENAI_API_KEY`, `DATABASE_URL`, session secrets, or other
credentials. Use Replit Secrets locally in the workspace and Render secret
environment variables in deployed services.