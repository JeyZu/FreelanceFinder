# FreelanceFinder Monorepo

A minimal TypeScript monorepo for **FreelanceFinder** with a Next.js frontend and Fastify backend.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+

### Installation

```bash
pnpm install
```

### Development

Run both the web and API apps concurrently:

```bash
pnpm dev
```

- Web app: http://localhost:3000
- API: http://localhost:3001 (`GET /health` → `{ ok: true }`)

### Additional Scripts

All scripts are executed through Turborepo at the root:

```bash
pnpm build      # Build all apps
pnpm lint       # Lint all packages
pnpm typecheck  # Type-check TypeScript projects
pnpm test       # Run Vitest suites
```

### Environment Variables

- `apps/web/.env.example` — placeholder for future web environment variables.
- `apps/api/.env.example` — sets `PORT=3001` by default.

### Project Structure

```
apps/
  web/   # Next.js frontend (App Router)
  api/   # Fastify backend
packages/
  config/  # Shared TS/ESLint/Prettier settings
  types/   # Placeholder for shared types
```

Feel free to build on top of this foundation.
