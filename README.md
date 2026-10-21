# Atelier Store

Next.js (App Router) + TypeScript + Tailwind CSS v4, with Better Auth, Drizzle ORM and Neon Postgres.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
npm run auth:generate        # write Better Auth tables to src/db/schema/auth.ts
npm run db:generate && npm run db:migrate
npm run dev
```

After generating the auth schema, re-export it from `src/db/schema/index.ts`.

## Layout

- `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- `src/lib/auth.ts` — Better Auth server instance (Drizzle adapter)
- `src/lib/auth-client.ts` — Better Auth React client
- `src/db/index.ts` — Drizzle client over Neon HTTP
- `src/db/schema/` — Drizzle table definitions
- `drizzle.config.ts` — drizzle-kit config (migrations output to `drizzle/`)

## Scripts

`dev`, `build`, `start`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:push`, `db:studio`, `auth:generate`
