import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getOrderForCustomer } from "@/db/queries/orders";
import { abandonOrder } from "@/lib/orders";
import { requireUser } from "@/lib/session";

// Stripe sends the customer here when they leave Checkout. Ending the session
// now returns the reserved stock straight away instead of in 30 minutes; the
// bag was never emptied, so they land back on it as it was.
//
// This is a GET because Stripe redirects here. It only ends the signed-in
// customer's own pending checkout, which they could restart at any time.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function GET(request: NextRequest) {
  const user = await requireUser("/cart");
  const orderId = request.nextUrl.searchParams.get("order");

  if (orderId && UUID_PATTERN.test(orderId)) {
    const order = await getOrderForCustomer(user.id, orderId);
    if (order?.status === "pending") {
      try {
        if ((await abandonOrder(order)) === "released") revalidateTag("catalog", "max");
      } catch (error) {
        // The session expires on its own and the webhook or sweeper releases it.
        console.error(`Could not end checkout for order ${order.id}:`, error);
      }
    }
  }

  redirect("/cart");
}
