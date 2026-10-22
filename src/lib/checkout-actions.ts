"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getOrder, getPendingOrders } from "@/db/queries/orders";
import { abandonOrder, openCheckoutSession, reserveOrder } from "@/lib/orders";
import { requireUser } from "@/lib/session";

// The browser sends nothing but the request to check out. The bag, prices,
// totals and stock are all read on the server from PostgreSQL.

export type CheckoutState = { error: string | null };

/** A pending order this recent with no session is probably another tab mid-checkout. */
const IN_PROGRESS_MS = 2 * 60 * 1000;

/** Used with useActionState; the previous state and form data are ignored. */
export async function startCheckout(): Promise<CheckoutState> {
  const user = await requireUser("/cart");

  // One checkout at a time: end the customer's earlier ones and return their
  // stock, so it can be reserved again for this bag.
  let stockReleased = false;
  for (const order of await getPendingOrders(user.id)) {
    if (!order.stripeCheckoutSessionId && Date.now() - order.createdAt.getTime() < IN_PROGRESS_MS) {
      return { error: "Your checkout is already being prepared. Try again in a moment." };
    }
    let outcome: Awaited<ReturnType<typeof abandonOrder>>;
    try {
      outcome = await abandonOrder(order);
    } catch (error) {
      console.error(`Could not end checkout for order ${order.id}:`, error);
      if (stockReleased) updateTag("catalog");
      return { error: "We couldn't start checkout. Please try again." };
    }
    if (outcome === "completed") {
      if (stockReleased) updateTag("catalog");
      refresh();
      return { error: "Your earlier checkout has just gone through, so your bag has been updated." };
    }
    if (outcome === "released") stockReleased = true;
  }

  const reservation = await reserveOrder(user);
  if (!reservation.ok) {
    if (stockReleased) updateTag("catalog");
    refresh();
    return {
      error:
        reservation.reason === "empty"
          ? "Your bag is empty."
          : reservation.reason === "stock"
            ? "Some pieces in your bag have just sold out. Review your bag and try again."
            : "Your order is below the minimum we can charge.",
    };
  }
  updateTag("catalog");

  let url: string | null = null;
  try {
    url = await openCheckoutSession(reservation.orderId);
  } catch (error) {
    console.error(`Could not open checkout for order ${reservation.orderId}:`, error);
    // Stripe may have made a session before the failure, so ask it before
    // putting the stock back. If that fails too, the sweeper releases it.
    const order = await getOrder(reservation.orderId);
    if (order) await abandonOrder(order).catch(() => undefined);
    updateTag("catalog");
  }
  if (!url) {
    // Null without an error: another checkout from this customer ended this one.
    return { error: "We couldn't start checkout. Please try again." };
  }

  redirect(url);
}
