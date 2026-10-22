import "server-only";
import Stripe from "stripe";

// One Stripe client per server instance, created on first use so that
// `next build` and scripts that never take payments don't need the keys.
// Use a restricted key (rk_…) with write access to Checkout Sessions and
// read access to Charges and PaymentIntents.

let client: Stripe | undefined;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key, {
      apiVersion: "2026-09-30.endive",
      maxNetworkRetries: 2,
      appInfo: { name: "atelier-store" },
    });
  }
  return client;
}

export function stripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  return secret;
}
