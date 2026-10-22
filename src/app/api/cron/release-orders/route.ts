import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getLapsedReservations } from "@/db/queries/orders";
import { abandonOrder } from "@/lib/orders";

// A backstop for missed webhooks: releases pending orders whose Checkout
// Session has expired, and records any that were paid. Run it on a schedule
// with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this header).

/** How long after a session expires to wait for its webhook first. */
const GRACE_MS = 5 * 60 * 1000;

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const outcomes = { released: 0, completed: 0, unchanged: 0, failed: 0 };
  for (const order of await getLapsedReservations(GRACE_MS)) {
    try {
      outcomes[await abandonOrder(order)] += 1;
    } catch (error) {
      outcomes.failed += 1;
      console.error(`Could not release order ${order.id}:`, error);
    }
  }
  if (outcomes.released > 0) revalidateTag("catalog", "max");

  return Response.json(outcomes);
}

function authorized(header: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
