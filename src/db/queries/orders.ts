import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, orderItems, orders, productImages, products, productStock } from "@/db/schema";

// Order and checkout reads are uncached on purpose: they decide what a
// customer is charged and whether stock is available. Never wrap these in
// 'use cache'.

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;

/**
 * A customer's bag as checkout prices it: live product prices and stock
 * straight from PostgreSQL, in the order lines were added.
 */
export async function getCheckoutLines(userId: string) {
  return db
    .select({
      productId: products.id,
      slug: products.slug,
      name: products.name,
      color: products.color,
      size: cartItems.size,
      sizeSystem: products.sizeSystem,
      imageUrl: productImages.url,
      unitPriceCents: products.priceCents,
      quantity: cartItems.quantity,
      stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    )
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));
}

export async function getOrder(orderId: string): Promise<Order | undefined> {
  const [row] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return row;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  return db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.id));
}

/** One of the customer's orders, by its Checkout Session; undefined if not theirs. */
export async function getOrderForCustomerBySession(userId: string, sessionId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.stripeCheckoutSessionId, sessionId), eq(orders.userId, userId)))
    .limit(1);
  return row;
}

/** One of the customer's orders by id; undefined if not theirs. */
export async function getOrderForCustomer(userId: string, orderId: string) {
  const [row] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  return row;
}

/**
 * Orders the customer completed checkout for. `pending` and `expired` are
 * open or abandoned checkout attempts, not orders, so history leaves them out.
 */
export const PLACED_ORDER_STATUSES = ["processing", "paid", "refunded", "failed"] as const;

export function isPlacedOrder(order: Order) {
  return (PLACED_ORDER_STATUSES as readonly string[]).includes(order.status);
}

/** The customer's placed orders, newest first, with how many pieces each holds. */
export async function getCustomerOrders(userId: string) {
  return db
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.mapWith(Number),
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), inArray(orders.status, [...PLACED_ORDER_STATUSES])))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));
}

/** The customer's orders still holding a stock reservation before payment. */
export async function getPendingOrders(userId: string): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "pending")))
    .orderBy(asc(orders.createdAt));
}

/**
 * Pending orders whose reservation should be over: the session expired more
 * than `graceMs` ago, or no session was ever recorded. For the sweeper.
 */
export async function getLapsedReservations(graceMs: number, limit = 50): Promise<Order[]> {
  const cutoff = new Date(Date.now() - graceMs);
  return db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        or(
          and(isNotNull(orders.reservationExpiresAt), lt(orders.reservationExpiresAt, cutoff)),
          and(isNull(orders.reservationExpiresAt), lt(orders.createdAt, cutoff)),
        ),
      ),
    )
    .orderBy(asc(orders.reservationExpiresAt))
    .limit(limit);
}
