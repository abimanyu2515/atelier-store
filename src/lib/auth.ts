import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { assertStrongAuthSecret } from "@/lib/auth-secret";

// Better Auth accepts any explicitly configured secret; reject weak ones first.
assertStrongAuthSecret();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  // nextCookies must stay last so server actions can set auth cookies.
  plugins: [nextCookies()],
});
