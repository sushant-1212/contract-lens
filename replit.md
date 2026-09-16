# ContractLens

ContractLens monitors API reliability, catches contract drift, and helps engineers investigate incidents with evidence-backed diagnosis.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/contract-lens` — React/Vite frontend
- `artifacts/api-server` — Express API and AI diagnosis
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/db/src/schema/contract-lens.ts` — PostgreSQL/Drizzle schema
- `lib/api-client-react` and `lib/api-zod` — generated client and validation code

## Architecture decisions

- The API contract is authored in OpenAPI and generated into Zod schemas and React Query hooks.
- An empty database is seeded on first read of the ContractLens routes so local development has useful data immediately.
- AI diagnosis receives incident, timeline, and affected-check evidence and is instructed to avoid unsupported claims.
- The diagnosis client supports both standard OpenAI keys and OpenAI-compatible Groq keys without exposing credentials.

## Product

The UI provides an overview dashboard, service catalog, synthetic API checks, incident timelines, run/resolution actions, and AI-assisted diagnosis.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- The API and Vite servers require an explicit `PORT`; the Vite app also requires `BASE_PATH`.
- Keep provider credentials in Replit Secrets or deployment environment variables, never in source control.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
