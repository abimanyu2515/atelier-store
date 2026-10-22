import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { auth } from "@/lib/auth";

// The data access layer for auth. Pages, server actions and route handlers
// read the session through these helpers, never `auth.api.getSession` directly.
//
// Reads are uncached (React `cache` only dedupes within one request). A
// `'use cache: private'` session would keep showing account or admin UI for
// minutes after sign-out or a role change. Call these inside <Suspense>:
// they read request headers.
//
// `connection()` keeps session reads out of prefetched App Shells. With
// partialPrefetching, a shell render can resolve headers(), and Better Auth
// then compares the session's expiry with `new Date()`, which Next rejects
// during prerendering. Session UI streams in after navigation instead.

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
};

export const getSession = cache(async () => {
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

/** The signed-in user, or a redirect to sign-in that returns to `returnTo`. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const session = await getSession();
  if (!session) {
    redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }
  const { id, name, email, role, createdAt } = session.user;
  return { id, name, email, role, createdAt };
}

/** The signed-in admin. Anyone else gets a 404, so the admin area stays hidden. */
export async function requireAdmin(returnTo = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (user.role !== "admin") notFound();
  return user;
}
