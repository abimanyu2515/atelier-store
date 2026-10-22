"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";

// Sign-in and sign-up deliberately don't live here: Better Auth applies rate
// limiting only to requests through its /api/auth handler, and `auth.api.*`
// calls from a server action skip it. Those forms use `authClient` instead.

export async function signOut() {
  try {
    // Deletes the session row; nextCookies() clears the cookie.
    await auth.api.signOut({ headers: await headers() });
  } catch (error) {
    // Already signed out (expired or missing session): nothing to end.
    if (!(error instanceof APIError)) throw error;
  }
  redirect("/");
}
