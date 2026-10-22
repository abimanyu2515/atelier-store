import "server-only";
import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/db";
import {
  getCheckoutLines,
  getOrder,
  getOrderItems,
  type Order,
  type OrderItem,
} from "@/db/queries/orders";
import { orderItems, orders, productStock } from "@/db/schema";
import { stripe } from "@/lib/stripe";

// Orders, stock reservations and their Stripe Checkout Sessions.
//
// Prices and totals come only from PostgreSQL. An order is created, and its
// stock reserved, before the customer is sent to Stripe. It becomes `paid`
// only when Stripe's API says the session is paid; the browser reaching the
// success page proves nothing. Every status change is a compare-and-set
// (`… where status in (…)`), so webhook redeliveries, the success page and
// the sweeper can all run these functions for the same order safely.
//
// neon-http has no interactive transactions. `db.batch` and single SQL
// statements with data-modifying CTEs are each atomic, so every write below
// is one of those.
//
// Nothing here invalidates the "catalog" cache tag, because some callers
// render pages. Callers that change stock (reserveOrder, releaseOrder,
// abandonOrder) must call updateTag or revalidateTag themselves.

const CURRENCY = "usd";
/** Stripe requires a session to stay open at least 30 minutes after it is created. */
const RESERVATION_MS = 32 * 60 * 1000;
/** Stripe's smallest USD charge. */
const MINIMUM_CHARGE_CENTS = 50;
const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
  ["US"];
/** Tags this integration's sessions in the Stripe Dashboard. */
const INTEGRATION_IDENTIFIER = "atelier-checkout-kqzmtrwv";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type OrderStatus = Order["status"];

export type ReserveResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "empty" | "stock" | "minimum" };

/**
 * Creates a pending order from the customer's bag and reserves its stock, all
 * in one transaction. Prices and stock are read here, uncached. If another
 * checkout takes the last units first, `product_stock_quantity_check` fails
 * the decrement and nothing is written.
 */
export async function reserveOrder(user: { id: string; email: string }): Promise<ReserveResult> {
  const lines = await getCheckoutLines(user.id);
  if (lines.length === 0) return { ok: false, reason: "empty" };

  // Stock is shared by every size of a product.
  const units = new Map<number, { quantity: number; stock: number }>();
  let totalCents = 0;
  for (const line of lines) {
    const held = units.get(line.productId)?.quantity ?? 0;
    units.set(line.productId, { quantity: held + line.quantity, stock: line.stock });
    totalCents += line.unitPriceCents * line.quantity;
  }
  if ([...units.values()].some((unit) => unit.quantity > unit.stock)) {
    return { ok: false, reason: "stock" };
  }
  if (totalCents < MINIMUM_CHARGE_CENTS) return { ok: false, reason: "minimum" };

  const orderId = crypto.randomUUID();
  try {
    await db.batch([
      db.insert(orders).values({
        id: orderId,
        userId: user.id,
        status: "pending",
        currency: CURRENCY,
        subtotalCents: totalCents,
        // Shipping is complimentary and tax isn't collected yet.
        totalCents,
        email: user.email,
        reservationExpiresAt: new Date(Date.now() + RESERVATION_MS),
      }),
      db.insert(orderItems).values(
        lines.map((line) => ({
          orderId,
          productId: line.productId,
          productSlug: line.slug,
          productName: line.name,
          color: line.color,
          size: line.size,
          sizeSystem: line.size ? line.sizeSystem : null,
          imageUrl: line.imageUrl,
          unitPriceCents: line.unitPriceCents,
          quantity: line.quantity,
        })),
      ),
      ...[...units].map(([productId, { quantity }]) =>
        db
          .update(productStock)
          .set({ quantity: sql`${productStock.quantity} - ${quantity}` })
          .where(eq(productStock.productId, productId)),
      ),
    ]);
  } catch (error) {
    if (violates(error, "product_stock_quantity_check")) return { ok: false, reason: "stock" };
    throw error;
  }
  return { ok: true, orderId };
}

/**
 * Creates the Checkout Session for a pending order and records it. Returns
 * the URL to send the customer to, or null if the order was released while
 * the session was being created (it is expired again straight away).
 */
export async function openCheckoutSession(orderId: string): Promise<string | null> {
  const order = await getOrder(orderId);
  if (order?.status !== "pending") return null;

  const session = await createCheckoutSession(order);
  const [attached] = await db
    .update(orders)
    .set({ stripeCheckoutSessionId: session.id })
    .where(
      and(
        eq(orders.id, order.id),
        eq(orders.status, "pending"),
        or(isNull(orders.stripeCheckoutSessionId), eq(orders.stripeCheckoutSessionId, session.id)),
      ),
    )
    .returning({ id: orders.id });

  if (!attached) {
    await stripe().checkout.sessions.expire(session.id).catch(() => undefined);
    return null;
  }
  return session.url;
}

/**
 * Creates an order's Checkout Session. Every parameter comes from the order
 * row, and the idempotency key is the order id, so calling this again for
 * the same order returns the original session instead of making another.
 */
async function createCheckoutSession(order: Order, items?: OrderItem[]) {
  const lines = items ?? (await getOrderItems(order.id));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is not set");
  if (!order.reservationExpiresAt) throw new Error(`Order ${order.id} has no reservation`);

  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: lines.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: order.currency,
          unit_amount: item.unitPriceCents,
          product_data: {
            name: item.productName,
            description:
              [item.color, item.size && `Size ${item.size} (${item.sizeSystem})`]
                .filter(Boolean)
                .join(" · ") || undefined,
            images: item.imageUrl ? [item.imageUrl] : undefined,
            metadata: { productSlug: item.productSlug },
          },
        },
      })),
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      customer_email: order.email ?? undefined,
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      expires_at: Math.floor(order.reservationExpiresAt.getTime() / 1000),
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/cancel?order=${order.id}`,
      integration_identifier: INTEGRATION_IDENTIFIER,
    },
    { idempotencyKey: `checkout-${order.id}` },
  );
}

/**
 * Ends a pending order's checkout and returns its stock, if Stripe agrees the
 * session can no longer be paid. Stripe is always asked first: an order whose
 * session might still complete is never released. If the session turns out
 * to be complete, the payment is recorded instead.
 */
export async function abandonOrder(order: Order): Promise<"released" | "completed" | "unchanged"> {
  let session = await findSession(order);

  if (session?.status === "open") {
    try {
      session = await stripe().checkout.sessions.expire(session.id);
    } catch {
      // Usually the customer paid in the meantime; look again.
      session = await stripe().checkout.sessions.retrieve(session.id);
    }
  }

  if (session?.status === "complete") {
    await syncCheckoutSession(session);
    return "completed";
  }
  if (session === null || session.status === "expired") {
    return (await releaseOrder(order.id, "expired", ["pending"])) ? "released" : "unchanged";
  }
  return "unchanged";
}

/** The order's session from Stripe, or null if none can still be paid. */
async function findSession(order: Order): Promise<Stripe.Checkout.Session | null> {
  if (order.stripeCheckoutSessionId) {
    return stripe().checkout.sessions.retrieve(order.stripeCheckoutSessionId);
  }
  // No session was recorded: the server stopped between creating it and
  // saving it, or never reached Stripe. Replaying the create with the same
  // idempotency key returns the original session if one exists.
  try {
    return await createCheckoutSession(order);
  } catch (error) {
    // Stripe refuses a new session once the reservation time has passed, and
    // any session made for it expired at that same moment.
    const lapsed = order.reservationExpiresAt !== null && order.reservationExpiresAt <= new Date();
    if (lapsed && error instanceof Stripe.errors.StripeInvalidRequestError) return null;
    throw error;
  }
}

/**
 * Moves an order from one of `from` to `to` and returns its reserved stock,
 * in one statement. Returns false if the order wasn't in `from`, so stock is
 * never returned twice.
 */
export async function releaseOrder(
  orderId: string,
  to: Extract<OrderStatus, "expired" | "failed">,
  from: OrderStatus[],
): Promise<boolean> {
  const result = await db.execute<{ released: number }>(sql`
    with released as (
      update orders set status = ${to}, updated_at = now()
      where id = ${orderId} and status in (${list(from)})
      returning id
    ), units as (
      select product_id, sum(quantity)::int as quantity
      from order_items
      where order_id in (select id from released) and product_id is not null
      group by product_id
    ), restocked as (
      update product_stock
      set quantity = product_stock.quantity + units.quantity, updated_at = now()
      from units
      where product_stock.product_id = units.product_id
      returning 1
    )
    select count(*)::int as released from released
  `);
  return (result.rows[0]?.released ?? 0) > 0;
}

/**
 * Brings an order up to date with its Checkout Session as Stripe reports it.
 * Pass a session id, or a session just fetched from the Stripe API; event
 * payloads can be stale or out of order, so they are never passed directly.
 * Only `payment_status === "paid"` marks an order paid.
 */
export async function syncCheckoutSession(
  sessionOrId: string | Stripe.Checkout.Session,
): Promise<OrderStatus | null> {
  const session =
    typeof sessionOrId === "string"
      ? await stripe().checkout.sessions.retrieve(sessionOrId)
      : sessionOrId;

  const order = await orderForSession(session);
  if (!order) return null;
  if (session.status !== "complete") return order.status;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  if (session.payment_status === "paid" && paymentIntentId) {
    await markPaid(order, session, paymentIntentId);
  } else if (session.payment_status === "unpaid") {
    // A delayed payment method (e.g. bank debit) is still clearing; stock stays reserved.
    await db
      .update(orders)
      .set({
        status: "processing",
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
  }

  return (await getOrder(order.id))?.status ?? null;
}

/**
 * Marks an order paid with Stripe's amounts and the shipping details the
 * customer entered, and takes the bought units out of their bag, in one
 * statement. Flags the order for review if Stripe charged a different amount
 * or currency, or if its reservation had already been released.
 */
async function markPaid(order: Order, session: Stripe.Checkout.Session, paymentIntentId: string) {
  const shipping = session.collected_information?.shipping_details ?? null;
  const address = shipping && {
    line1: shipping.address.line1,
    line2: shipping.address.line2,
    city: shipping.address.city,
    state: shipping.address.state,
    postalCode: shipping.address.postal_code,
    country: shipping.address.country,
  };
  const amountMismatch =
    session.amount_total !== order.totalCents || session.currency !== order.currency;

  const result = await db.execute<{ paid: number }>(sql`
    with paid as (
      update orders set
        status = 'paid',
        paid_at = now(),
        amount_paid_cents = ${session.amount_total},
        stripe_checkout_session_id = ${session.id},
        stripe_payment_intent_id = ${paymentIntentId},
        email = coalesce(${session.customer_details?.email ?? null}, email),
        shipping_name = ${shipping?.name ?? null},
        shipping_address = ${address ? JSON.stringify(address) : null}::jsonb,
        needs_review = needs_review or ${amountMismatch} or status in ('expired', 'failed'),
        updated_at = now()
      where id = ${order.id} and status in ('pending', 'processing', 'expired', 'failed')
      returning id, user_id
    ), bought as (
      select order_items.product_id, order_items.size, order_items.quantity, paid.user_id
      from order_items join paid on order_items.order_id = paid.id
      where order_items.product_id is not null
    ), removed as (
      delete from cart_items using bought
      where cart_items.user_id = bought.user_id
        and cart_items.product_id = bought.product_id
        and cart_items.size = bought.size
        and cart_items.quantity <= bought.quantity
      returning 1
    ), reduced as (
      update cart_items
      set quantity = cart_items.quantity - bought.quantity, updated_at = now()
      from bought
      where cart_items.user_id = bought.user_id
        and cart_items.product_id = bought.product_id
        and cart_items.size = bought.size
        and cart_items.quantity > bought.quantity
      returning 1
    )
    select count(*)::int as paid from paid
  `);

  const marked = (result.rows[0]?.paid ?? 0) > 0;
  if (marked && (amountMismatch || order.status === "expired" || order.status === "failed")) {
    console.error(
      `Order ${order.id} was paid but needs review: Stripe charged ${session.amount_total} ${session.currency}, order total ${order.totalCents} ${order.currency}, previous status ${order.status}.`,
    );
  }
}

/** Marks a paid order refunded once Stripe has refunded all of it. */
export async function markRefunded(paymentIntentId: string): Promise<boolean> {
  const rows = await db
    .update(orders)
    .set({ status: "refunded" })
    .where(and(eq(orders.stripePaymentIntentId, paymentIntentId), eq(orders.status, "paid")))
    .returning({ id: orders.id });
  return rows.length > 0;
}

/**
 * The order a session was created for. The order id comes from the session's
 * metadata, which only this server sets, and must agree with any session id
 * already recorded on the order.
 */
export async function orderForSession(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId || !UUID_PATTERN.test(orderId)) {
    console.error(`Checkout Session ${session.id} has no order id.`);
    return undefined;
  }
  const order = await getOrder(orderId);
  if (!order || (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== session.id)) {
    console.error(`Checkout Session ${session.id} does not match order ${orderId}.`);
    return undefined;
  }
  return order;
}

function list(values: readonly string[]): SQL {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

/** Whether a database error, or one it wraps, is a violation of `constraint`. */
function violates(error: unknown, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ("constraint" in current && current.constraint === constraint) return true;
    if (current.message.includes(constraint)) return true;
  }
  return false;
}
