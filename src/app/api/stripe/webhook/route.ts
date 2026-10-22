import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import type Stripe from "stripe";
import { db } from "@/db";
import { stripeEvents } from "@/db/schema";
import { markRefunded, orderForSession, releaseOrder, syncCheckoutSession } from "@/lib/orders";
import { stripe, stripeWebhookSecret } from "@/lib/stripe";

// Stripe's record of each payment is the source of truth for orders. Subscribe
// this endpoint to exactly the event types handled below.
//
// An event is recorded in stripe_events only after it has been handled, so a
// failure returns 500 and Stripe retries it. Every handler is idempotent, so
// a retry after a partial run, or two deliveries at once, change nothing twice.

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    // The raw body, exactly as sent: re-serialized JSON fails verification.
    event = stripe().webhooks.constructEvent(await request.text(), signature, stripeWebhookSecret());
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const [seen] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id))
    .limit(1);
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event);
  } catch (error) {
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error);
    return new Response("Event handling failed", { status: 500 });
  }

  await db.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing();
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      // Re-read the session from Stripe; only a paid session marks an order paid.
      await syncCheckoutSession(event.data.object.id);
      return;

    case "checkout.session.async_payment_failed": {
      const order = await orderForSession(event.data.object);
      if (order && (await releaseOrder(order.id, "failed", ["pending", "processing"]))) {
        revalidateTag("catalog", "max");
      }
      return;
    }

    case "checkout.session.expired": {
      // Abandoned: the customer never paid within the reservation window.
      const order = await orderForSession(event.data.object);
      if (order && (await releaseOrder(order.id, "expired", ["pending"]))) {
        revalidateTag("catalog", "max");
      }
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object;
      const paymentIntentId =
        typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      // Partial refunds leave the order paid. Refunded stock isn't put back
      // automatically; the goods may already have shipped.
      if (charge.refunded && paymentIntentId) await markRefunded(paymentIntentId);
      return;
    }
  }
}
