// Grants the admin role to an existing account. Roles can't be set through the
// auth API (`role` has `input: false`), so this is the only way in.
//
//   npm run auth:make-admin -- someone@example.com

import { loadEnvConfig } from "@next/env";
import { eq, sql } from "drizzle-orm";
import { user } from "./schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run auth:make-admin -- <email>");
  }

  // `./index` throws at import time without DATABASE_URL, so load env first.
  loadEnvConfig(process.cwd());
  const { db } = await import("./index");

  const rows = await db
    .update(user)
    .set({ role: "admin", updatedAt: sql`now()` })
    .where(eq(user.email, email))
    .returning({ id: user.id });

  if (rows.length === 0) {
    throw new Error("No account with that email. Sign up first, then re-run.");
  }
  console.log("Granted admin. It applies on the user's next request.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
