import { timestamp } from "drizzle-orm/pg-core";

// Shared column helpers. Not a table file, so it isn't re-exported from
// ./index (the relational client and Better Auth adapter read every export).

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
