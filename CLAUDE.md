# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js version

This is Next.js 16.4 — APIs and conventions differ from older versions. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (e.g. `01-app/02-guides/authentication-with-cache-components.md`, `01-app/03-api-reference/`). `next dev` rewrites the block in `AGENTS.md`; leave it in place.

`next.config.ts` enables `cacheComponents` and `partialPrefetching`. Consequences:
- Reading `cookies()`/`headers()` (including Better Auth's `auth.api.getSession({ headers: await headers() })`) outside a `<Suspense>` boundary is a build error. Session-dependent UI must stream behind `<Suspense>`.
- Session-derived reads can use `'use cache: private'`; server-side caching requires passing an extracted value (e.g. `userId`) into `'use cache'`.

Tailwind CSS v4 is wired through the `@tailwindcss/turbopack` loader in `next.config.ts` (no `tailwind.config` file; theme lives in `src/app/globals.css` via `@theme`).

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (requires DATABASE_URL to be set)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run auth:generate  # Better Auth CLI → writes Drizzle tables to src/db/schema/auth.ts
npm run db:generate    # drizzle-kit: create SQL migrations in drizzle/
npm run db:migrate     # apply migrations
npm run db:seed        # upsert the sample catalog (src/db/seed-data.ts); safe to re-run
npm run db:push        # push schema directly (scratch experiments only; see conventions)
npm run db:studio      # Drizzle Studio
```

There is no test runner configured yet.

Environment: copy `.env.example` to `.env.local`. Required: `DATABASE_URL` (Neon pooled URL), `BETTER_AUTH_SECRET` (`npx auth secret`), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. `src/db/index.ts` throws at import time if `DATABASE_URL` is missing, so build and the auth CLI both need it.

## Architecture

- **Database**: `src/db/index.ts` exports a single Drizzle client (`db`) over Neon's HTTP driver (`drizzle-orm/neon-http`), built with `schema` from `src/db/schema/index.ts`. Every table file in `src/db/schema/` must be re-exported from that index — both the `db` client's relational queries and the Better Auth adapter depend on it. `drizzle.config.ts` loads env via `@next/env` so drizzle-kit sees the same `.env*` files as Next.
- **Auth**: `src/lib/auth.ts` is the Better Auth server instance using `drizzleAdapter(db, { provider: "pg" })`. `nextCookies()` must remain the **last** plugin so server actions can set cookies. It's exposed at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` is the React client (`better-auth/react`).
- **Schema workflow**: after changing Better Auth config (plugins, fields), run `auth:generate`, ensure `src/db/schema/index.ts` re-exports `./auth`, then `db:generate` + `db:migrate`. The auth tables are not generated yet; a "Missing tables" warning during build is expected until they are.
- The Better Auth CLI is the `auth` npm package (pinned to the `better-auth` version); `@better-auth/cli` is deprecated. Don't add `import "server-only"` to `src/lib/auth.ts` or `src/db/index.ts` — the CLI loads those files outside Next and would fail.

## Database conventions

- **Migrations are versioned.** Change the schema, run `db:generate -- --name <change>`, review the SQL, commit it under `drizzle/`, then `db:migrate`. Don't use `db:push` on the shared database.
- **Money is integer cents** (`price_cents`). Never store floats. The query layer converts to the UI's `Product.price`.
- **Stock lives in `product_stock`**, one row per product, `quantity >= 0`. When variants arrive, re-key this table to the variant rather than adding a stock column to `products`. `sizes`/`size_system` on products are display options only, not stock-keeping units.
- **Pages never query `db` directly for catalog data.** They go through `src/db/queries/catalog.ts`. Those functions are `'use cache'` with `cacheTag("catalog")` and return the existing `Product`/`Category` types from `src/lib/catalog.ts`, so components stay database-agnostic.
- **Every write to catalog or stock data must invalidate the cache**: `updateTag("catalog")` in a server action, `revalidateTag("catalog", "max")` elsewhere. Anything that decides availability (checkout, add-to-cart) must read stock uncached, never from the cached catalog. `src/proxy.ts` likewise checks slugs uncached.
- **The build needs a migrated, seeded database.** With `cacheComponents`, `generateStaticParams` for `/products/[slug]` must return at least one slug. `db:seed` upserts by slug and is safe to re-run.
- **Scripts that run outside Next** (`src/db/seed.ts` and similar, run with `tsx`) use relative imports, not `@/`. They call `loadEnvConfig(process.cwd())` before dynamically importing `./index`, because it throws at import time without `DATABASE_URL`.
