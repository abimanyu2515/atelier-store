import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";

// Product pages stream their content behind Suspense, so a `notFound()` there
// can only send a 200. Checking the slug here, before rendering starts, lets
// unknown products return a real 404.
export async function proxy(request: NextRequest) {
  if (await productExists(slugFrom(request.nextUrl.pathname))) return;

  // No route matches this path, so Next renders app/not-found.tsx with a 404.
  return NextResponse.rewrite(new URL("/404", request.url));
}

async function productExists(slug: string) {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, slug))
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
  matcher: "/products/:slug",
};
