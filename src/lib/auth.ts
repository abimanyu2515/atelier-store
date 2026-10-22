import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { assertStrongAuthSecret } from "@/lib/auth-secret";

// Better Auth accepts any explicitly configured secret; reject weak ones first.
assertStrongAuthSecret();

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false keeps role out of sign-up and update-user request bodies.
      // Promote users with `npm run auth:make-admin -- <email>`.
      role: { type: "string", required: true, defaultValue: "customer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    // No cookieCache: sign-out and role changes apply on the next request.
  },
  // The in-memory store is per instance, which serverless makes useless.
  rateLimit: { enabled: true, storage: "database" },
  // nextCookies must stay last so server actions can set auth cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
