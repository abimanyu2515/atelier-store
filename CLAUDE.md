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
npm run auth:make-admin -- <email>  # grant the admin role to an existing account
npm run db:push        # push schema directly (scratch experiments only; see conventions)
npm run db:studio      # Drizzle Studio
```

There is no test runner configured yet.

Environment: copy `.env.example` to `.env.local`. Required: `DATABASE_URL` (Neon pooled URL), `BETTER_AUTH_SECRET` (`npx auth secret`), `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`. `src/db/index.ts` throws at import time if `DATABASE_URL` is missing, so build and the auth CLI both need it. `src/lib/auth-secret.ts` (called from `auth.ts`) makes production — including `next build` — refuse a missing or weak auth secret: it must be hex/base64 decoding to ≥32 bytes, from `npx auth secret` or `openssl rand -base64 32`. Outside production it only warns, so `auth:generate` still runs without one. Don't relax this check; Better Auth itself only warns, and a guessable secret allows forging verify-email tokens (account takeover).

## Architecture

- **Database**: `src/db/index.ts` exports a single Drizzle client (`db`) over Neon's HTTP driver (`drizzle-orm/neon-http`), built with `schema` from `src/db/schema/index.ts`. Every table file in `src/db/schema/` must be re-exported from that index — both the `db` client's relational queries and the Better Auth adapter depend on it. `drizzle.config.ts` loads env via `@next/env` so drizzle-kit sees the same `.env*` files as Next.
- **Auth**: `src/lib/auth.ts` is the Better Auth server instance using `drizzleAdapter(db, { provider: "pg" })`. `nextCookies()` must remain the **last** plugin so server actions can set cookies. It's exposed at `src/app/api/auth/[...all]/route.ts` via `toNextJsHandler`. `src/lib/auth-client.ts` is the React client (`better-auth/react`).
- **Schema workflow**: after changing Better Auth config (plugins, fields), run `auth:generate` (writes `src/db/schema/auth.ts`; don't hand-edit it), then `db:generate` + `db:migrate`. A "Drizzle schema mismatch" error during `auth:generate` just means the DB is behind the config.
- **Session reads go through `src/lib/session.ts`**: `getSession()`, `requireUser(returnTo)`, `requireAdmin()`. They are uncached on purpose (no `'use cache: private'`) so sign-out and role changes apply on the next request, and they must run inside `<Suspense>`. Every protected page **and every server action / route handler** calls `requireUser`/`requireAdmin` itself; `src/proxy.ts` gives early 307/404s for `/account*` and `/admin*` but is not the authorization boundary. The proxy is also where session cookies get refreshed (server components can't write cookies), so keep forwarding its `Set-Cookie`s.
- **Sign-in/sign-up use `authClient` from the browser, not server actions.** Better Auth only rate-limits and origin-checks requests through `/api/auth/*`; `auth.api.signInEmail()` from a server action bypasses both. Post-auth redirects from `?next=` must go through `safeNext()` (`src/lib/safe-next.ts`).
- **Roles**: `user.role` is `"customer"` (default) or `"admin"`, declared with `input: false` so no API body can set it. Grant admin with `npm run auth:make-admin -- <email>`. Non-admins get a 404 for `/admin*`, not a 403. Rate limiting uses `storage: "database"` and keys on a single-valued `x-forwarded-for`; behind a proxy chain other than Vercel, set `advanced.ipAddress`.
- The Better Auth CLI is the `auth` npm package (pinned to the `better-auth` version); `@better-auth/cli` is deprecated. Don't add `import "server-only"` to `src/lib/auth.ts` or `src/db/index.ts` — the CLI loads those files outside Next and would fail.

## Payments (Stripe)

- Hosted Checkout Sessions with inline `price_data` built from `order_items`; no Stripe product catalog. Never take a price, total or payment status from the browser; `startCheckout` takes no input.
- An order is `paid` only when Stripe's API reports the session `payment_status === "paid"`, via `syncCheckoutSession`. The webhook (`src/app/api/stripe/webhook/route.ts`) is the source of truth; the success page calls the same idempotent sync. Never mark an order paid from a URL or event payload alone.
- Order status changes are compare-and-set (`where status in (…)`), so duplicate or concurrent webhook deliveries are harmless; `stripe_events` additionally skips known event ids.
- Before releasing a pending order's stock, ask Stripe (`abandonOrder`): only an `expired` session, or none at all, may be released. `/api/cron/release-orders` (Bearer `CRON_SECRET`) is the backstop for missed webhooks.
- `src/lib/orders.ts` never invalidates the cache itself (the success page calls it while rendering). Callers that reserve or release stock call `updateTag`/`revalidateTag("catalog", "max")`.
- Local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`, then set `STRIPE_WEBHOOK_SECRET`. Subscribe the endpoint to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired` and `charge.refunded`.

## Database conventions

- **Migrations are versioned.** Change the schema, run `db:generate -- --name <change>`, review the SQL, commit it under `drizzle/`, then `db:migrate`. Don't use `db:push` on the shared database.
- **Money is integer cents** (`price_cents`). Never store floats. The query layer converts to the UI's `Product.price`.
- **Stock lives in `product_stock`**, one row per product, `quantity >= 0`. When variants arrive, re-key this table to the variant rather than adding a stock column to `products`. `sizes`/`size_system` on products are display options only, not stock-keeping units.
- **Pages never query `db` directly for catalog data.** They go through `src/db/queries/catalog.ts`. Those functions are `'use cache'` with `cacheTag("catalog")` and return the existing `Product`/`Category` types from `src/lib/catalog.ts`, so components stay database-agnostic.
- **Every write to catalog or stock data must invalidate the cache**: `updateTag("catalog")` in a server action, `revalidateTag("catalog", "max")` elsewhere. Anything that decides availability (checkout, add-to-cart) must read stock uncached, never from the cached catalog. `src/proxy.ts` likewise checks slugs uncached.
- **The build needs a migrated, seeded database.** With `cacheComponents`, `generateStaticParams` for `/products/[slug]` must return at least one slug. `db:seed` upserts by slug and is safe to re-run.
- **Checkout reserves stock.** `reserveOrder` (`src/lib/orders.ts`) creates a `pending` order, snapshots `order_items` and decrements `product_stock` in one `db.batch`; the `quantity >= 0` check rejects oversell. Stock goes back only through `releaseOrder`, whose status compare-and-set makes a double restock impossible.
- **Scripts that run outside Next** (`src/db/seed.ts` and similar, run with `tsx`) use relative imports, not `@/`. They call `loadEnvConfig(process.cwd())` before dynamically importing `./index`, because it throws at import time without `DATABASE_URL`.
