import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";
import { timestamps } from "./columns";

/**
 * One row per product and size in a signed-in customer's bag. Prices and
 * availability are always read live from products and product_stock; the
 * cart stores neither and reserves no stock.
 */
export const cartItems = pgTable(
  "cart_items",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** "" for products without sizes, so the unique key still applies. */
    size: text("size").notNull().default(""),
    quantity: integer("quantity").notNull(),
    ...timestamps,
  },
  (table) => [
    // Leads with user_id, so it also serves "this user's bag" lookups.
    unique("cart_items_user_product_size_key").on(table.userId, table.productId, table.size),
    check("cart_items_quantity_check", sql`${table.quantity} > 0`),
  ],
);

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(user, {
    fields: [cartItems.userId],
    references: [user.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
}));
