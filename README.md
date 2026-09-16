# ContractLens

> API reliability and contract intelligence for engineering teams.

ContractLens helps teams detect API contract drift, understand service health,
and investigate incidents from one focused workspace. It brings monitoring
signal, contract-aware checks, incident timelines, and evidence-backed AI
diagnosis together in a single product.

## Why ContractLens

Traditional uptime monitoring can tell you that an endpoint is responding. It
often cannot tell you that a response quietly changed and broke a consumer.
ContractLens focuses on that gap.

For example, a payment endpoint may continue returning HTTP 200 after a
deployment while dropping a required `currency` field. ContractLens captures
the failed check, connects it to the incident timeline, and helps explain the
likely cause.

## Core capabilities

- **Reliability overview** — uptime, latency, error rate, service health, and
  active incident signal
- **Service catalog** — ownership, endpoint coverage, health status, and
  performance context
- **API checks** — HTTP method, endpoint, status, latency, success rate, and
  recent run history
- **Incident management** — severity, status, error rate, duration, timelines,
  resolution, and affected checks
- **AI diagnosis** — probable cause, confidence, recommendations, and the
  evidence supporting each diagnosis
- **Contract-first API** — OpenAPI is the source of truth for generated client
  hooks, request schemas, response schemas, and TypeScript types

## How it works

```text
API check
   ↓
Check run and response evidence
   ↓
Incident timeline
   ↓
AI-assisted diagnosis
   ↓
Recommended action
```

The frontend communicates with an Express API. The API persists services,
checks, check runs, incidents, and timeline events in PostgreSQL. When an
engineer requests a diagnosis, the API sends the incident evidence to an
OpenAI-compatible model and validates the structured response before returning
it to the interface.

## Technology

- React, TypeScript, Vite, and Tailwind CSS
- Express 5
- PostgreSQL and Drizzle ORM
- Zod and drizzle-zod validation
- OpenAPI 3.1 and Orval-generated client code
- React Query for server state and cache invalidation
- OpenAI SDK for structured incident diagnosis
- pnpm workspace monorepo

## Run locally

### Prerequisites

- Node.js 24+
- pnpm
- PostgreSQL

### Setup

```bash
pnpm install
export DATABASE_URL="postgresql://..."
pnpm --filter @workspace/db run push
```

Start the API:

```bash
PORT=5000 pnpm --filter @workspace/api-server run dev
```

In a second terminal, start the frontend:

```bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/contract-lens run dev
```

The API is available at `http://localhost:5000/api` and the frontend at
`http://localhost:5173`.

To enable AI diagnosis, provide `OPENAI_API_KEY` through your environment.
Never commit credentials to the repository.

## Development commands

```bash
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
pnpm --filter @workspace/db run push
```

## Project structure

| Path | Responsibility |
| --- | --- |
| `artifacts/contract-lens` | React/Vite product interface |
| `artifacts/api-server` | Express API and diagnosis workflow |
| `lib/api-spec` | OpenAPI source contract |
| `lib/api-client-react` | Generated React Query client |
| `lib/api-zod` | Generated request and response schemas |
| `lib/db` | PostgreSQL connection and Drizzle schema |

## API

The API contract lives in `lib/api-spec/openapi.yaml`.

Primary resources include:

- `/api/dashboard`
- `/api/services`
- `/api/checks`
- `/api/incidents`
- `/api/incidents/:incidentId/diagnose`

## Project status

ContractLens is a functional full-stack MVP. It includes persistent service,
check, run, and incident workflows alongside an evidence-backed AI diagnosis
flow. A production monitoring expansion would add scheduled endpoint
execution, automatic alert creation, notification integrations, and
team-level access control.