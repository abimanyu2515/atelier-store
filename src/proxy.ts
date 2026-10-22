import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { auth } from "@/lib/auth";

// Pages stream their content behind Suspense, so a `notFound()` or `redirect()`
// there can only send a 200. Checking here, before rendering starts, gives
// unknown slugs a real 404 and signed-out visitors a real redirect.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isUnder(pathname, "/account") || isUnder(pathname, "/admin")) {
    return guardProtected(request);
  }
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    const { session, cookies } = await sessionFor(request);
    const response = session
      ? NextResponse.redirect(new URL("/account", request.url))
      : NextResponse.next();
    return withCookies(response, cookies);
  }

  const exists = pathname.startsWith("/categories/") ? categoryExists : productExists;
  if (await exists(slugFrom(pathname))) return;

  // No route matches this path, so Next renders app/not-found.tsx with a 404.
  return NextResponse.rewrite(new URL("/404", request.url));
}

// An early answer only. Pages re-check with requireUser/requireAdmin, and
// server actions must too: they can be posted to any path.
async function guardProtected(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { session, cookies } = await sessionFor(request);

  if (!session) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("next", pathname + search);
    return withCookies(NextResponse.redirect(signIn), cookies);
  }
  if (isUnder(pathname, "/admin") && session.user.role !== "admin") {
    return withCookies(NextResponse.rewrite(new URL("/404", request.url)), cookies);
  }
  return withCookies(NextResponse.next(), cookies);
}

// Server components can't write cookies, so this is where a session's expiry
// slides forward (once per `updateAge`) and where a dead session's cookie is
// cleared. Better Auth returns those cookies; pass them on to the browser.
async function sessionFor(request: NextRequest) {
  const { headers, response } = await auth.api.getSession({
    headers: request.headers,
    returnHeaders: true,
  });
  return { session: response, cookies: headers.getSetCookie() };
}

function withCookies(response: NextResponse, cookies: string[]) {
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

async function productExists(slug: string) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);
  return row !== undefined;
}

async function categoryExists(slug: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row !== undefined;
}

function slugFrom(pathname: string) {
  try {
    return decodeURIComponent(pathname.split("/")[2]);
  } catch {
    return ""; // Malformed escape sequence: treat as an unknown product
  }
}

export const config = {
  matcher: [
    "/products/:slug",
    "/categories/:slug",
    "/account/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};
