AGENTS.md — FreelanceFinder

Spec Source: Internal AGENTS.md spec v0.1
Version: 0.1.0
Updated: 2025-09-16
Repo Type: pnpm + Turborepo monorepo
Scopes: /apps/web (Next.js App Router), /apps/api (Fastify), /packages/* (config, types)


---

1) Mission

Provide a single, enforceable instruction layer for coding agents (Copilot/Cursor/Claude/Gemini/etc.) working in this repo so they generate code that fits our stack, style, and delivery cadence. Ship small, keep it simple, stay consistent.


---

2) Precedence

1. Repo configs > This file. (eslint/tsconfig/turbo/prettier/CI)


2. This file > prior prompts for this repo.


3. Human maintainer decisions override all of the above.



If a rule conflicts with an existing config, follow the config and open a PR to update this file.


---

3) Stack Profile

Frontend: Next.js (App Router, React Server Components by default)

Backend: Fastify (TypeScript)

Language: TypeScript (strict)

Tooling: pnpm workspaces, Turborepo, ESLint (Flat), Prettier 3, Vitest; Playwright (later)

State/DB: MVP = in-memory/mocks only (no DB yet)

Ports: web :3000, api :3001 (GET /health → { ok: true })



---

4) Repo Standards

4.1 Naming & Layout

Monorepo layout is fixed: apps/web, apps/api, packages/config, packages/types.

Directory names: kebab-case; files: kebab-case.ts(x) except Next.js route files.

Export names: camelCase for values/functions, PascalCase for types/components.

Scopes used in commits/PRs: web, api, config, types, repo.


4.2 TypeScript

"strict": true across projects. Do not silence with any or @ts-ignore unless tied to an issue with a TODO link.

Prefer narrow types and return types on public functions; avoid implicit any.

Shared contracts go in packages/types and are imported from there.


4.3 Formatting & Linting

ESLint (Flat) + Prettier 3 are the source of truth. Run pnpm lint and pnpm typecheck before PRs.

Fixable warnings must be fixed; non-fixable require a rationale in code (1–2 lines) and a TODO issue link.


4.4 Testing & Mocking

Vitest unit tests colocated: *.test.ts(x) next to code.

Minimum coverage rules are not enforced yet; test critical behaviors only.

Playwright will be added when a core user flow exists (smoke: home page loads, nav works).

Prefer pure functions. For Fastify, test handlers with injected deps; for Next.js, test utilities and server actions.


4.5 API/Network (Agents must follow)

No direct fetch in components. Create a thin API client wrapper per app:

Web: /apps/web/lib/api.ts with typed calls (input/output via packages/types).

API: for external calls (if any), /apps/api/lib/http.ts with timeouts/retries.


Error handling: Always catch and return typed Result ({ ok: true, data } | { ok: false, error: { code, message } }).

Timeouts: default 8s; Retries: default 2 with backoff for idempotent GETs.

Input validation: use zod at boundaries (router schemas, server actions). Place schemas in packages/types when shared.


4.6 State/DB

MVP: In-memory store or mock adapters. Do not add a DB without RFC approval.

Abstract storage via a simple interface (Storage<T>) so we can swap later.


4.7 Git & PR Process

Branches: feat/<scope>-<slug>, fix/<scope>-<slug>, chore/<scope>-<slug>.

Commits: Conventional Commits (e.g., feat(api): add health endpoint).

PRs small and focused (< ~300 LOC diff). Link issues when applicable.

Required local checks:

pnpm typecheck && pnpm lint && pnpm test && pnpm build


4.8 Forbidden Patterns

No unchecked any, no stray console.log (use a logger util), no secret values in code.

No ad-hoc HTTP in components/pages; always go via the API wrapper.

No global mutable singletons without an abstraction.



---

5) Security & Privacy (MVP)

Never commit .env files. Each app maintains .env.example (keep it updated).

For future user data/PII: add redaction utilities and avoid logging raw inputs.

Basic Fastify hardening: disable x-powered-by, validate inputs, treat client as untrusted.

Secrets loaded via environment only; prefer dotenv-safe when we introduce non-optional envs.



---

6) Quickstart for Coding Agents

1. Identify scope (web or api) and create a branch accordingly.


2. Follow the API wrapper pattern for any network call. Add/extend zod schemas as needed.


3. Keep components Server Components by default; mark "use client" only when necessary.


4. Write at least one Vitest test for critical behavior you touch.


5. Run local checks; ensure lint/format/type/test all pass.


6. Update .env.example if you add env usage.



---

7) Examples — Do / Don’t

Do (web):

// apps/web/lib/api.ts
import { z } from 'zod'
import { SearchQuery, SearchResult } from '@ff/types'

const SearchResultSchema = z.object({ items: z.array(z.object({ id: z.string(), title: z.string() })) })

export async function search(query: SearchQuery) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?q=${encodeURIComponent(query.q)}`, { next: { revalidate: 60 } })
  if (!res.ok) return { ok: false as const, error: { code: res.status, message: 'search_failed' } }
  const json = await res.json()
  const parsed = SearchResultSchema.safeParse(json)
  if (!parsed.success) return { ok: false as const, error: { code: 500, message: 'bad_schema' } }
  return { ok: true as const, data: parsed.data satisfies SearchResult }
}

Don’t (web):

// In a React component
const data = await fetch('/api/search').then(r => r.json()) // ❌ direct fetch, no validation, untyped

Do (api):

// apps/api/routes/health.ts
import { FastifyInstance } from 'fastify'

export default async function routes(f: FastifyInstance) {
  f.get('/health', async () => ({ ok: true }))
}

Don’t (api):

// Mixed concerns, no schema, logs secrets, broad catch-all errors — avoid


---

8) Monorepo Scopes (Rules by Path)

/apps/web

Server Components by default. Keep client boundaries minimal.

Pages/components in app/. Utilities in app/lib or lib/.

All network via /apps/web/lib/api.ts.


/apps/api

Routes in /routes, plugins in /plugins, utils in /lib.

Validate request/response with zod or JSON Schema.


/packages/config

Centralize ESLint/TS/Prettier/Turbo configs.


/packages/types

All shared DTOs and validation schemas.



---

9) Limitations

No database standard yet; storage is mocked.

CI not defined here (recommend GitHub Actions to run type/lint/test on PRs).



---

10) Changelog (for this file)

0.1.0 — 2025-09-16
Added: Initial agent rules for web/api, API wrapper pattern, scopes, quickstart, examples.
Changed: Clarified precedence and forbidden patterns.
Fixed: N/A
Removed: N/A
