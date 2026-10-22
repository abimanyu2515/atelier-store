import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderDetails, OrderItems } from "@/components/order-summary";
import {
  getOrderForCustomerBySession,
  getOrderItems,
  isPlacedOrder,
  type Order,
} from "@/db/queries/orders";
import { formatOrderNumber } from "@/lib/format";
import { syncCheckoutSession } from "@/lib/orders";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order confirmation",
  robots: { index: false },
};

const SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{1,200}$/;

// Reaching this page proves nothing about payment: anyone can type the URL.
// The session id is only used to ask Stripe for the session, and the order
// shows whatever status Stripe reports. The webhook records the same result
// independently, so it doesn't matter which arrives first.
export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  return (
    <main className="section container-page flex-1">
      <Suspense fallback={<ConfirmationSkeleton />}>
        <Confirmation searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Confirmation({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>;
}) {
  const { session_id } = await searchParams;
  const sessionId = typeof session_id === "string" ? session_id : "";
  const user = await requireUser(`/checkout/success?session_id=${encodeURIComponent(sessionId)}`);

  if (!SESSION_ID_PATTERN.test(sessionId)) return <OrderNotFound />;

  // Read the session from Stripe so the page doesn't wait on the webhook.
  // This only ever records what Stripe's API reports.
  try {
    await syncCheckoutSession(sessionId);
  } catch (error) {
    console.error(`Could not check Checkout Session ${sessionId}:`, error);
  }

  const order = await getOrderForCustomerBySession(user.id, sessionId);
  if (!order) return <OrderNotFound />;
  const items = await getOrderItems(order.id);
  const { heading, message } = statusCopy(order);

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="type-label text-muted-foreground">Order {formatOrderNumber(order.id)}</p>
        <h1 className="type-heading">{heading}</h1>
        <p className="type-body text-muted-foreground">{message}</p>
      </header>

      <OrderItems items={items} />
      <OrderDetails order={order} />

      <div className="flex flex-wrap gap-3">
        {order.status === "pending" && (
          <Link href={`/checkout/success?session_id=${sessionId}`} className="btn btn-primary">
            Check again
          </Link>
        )}
        {isPlacedOrder(order) && (
          <Link href={`/account/orders/${order.id}`} className="btn btn-primary">
            View order
          </Link>
        )}
        <Link href="/new-arrivals" className="btn btn-secondary">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function statusCopy(order: Order): { heading: string; message: string } {
  switch (order.status) {
    case "paid":
    case "refunded":
      return {
        heading: "Thank you for your order",
        message: "Your payment is confirmed and your pieces are being prepared.",
      };
    case "processing":
      return {
        heading: "Your payment is processing",
        message:
          "Your bank is still confirming the payment. We're holding your pieces until it clears.",
      };
    case "pending":
      return {
        heading: "Confirming your payment",
        message: "We haven't received confirmation from our payment provider yet. This usually takes a few seconds.",
      };
    case "failed":
    case "expired":
      return {
        heading: "This order wasn't completed",
        message: "No payment was taken. The pieces are back in stock and still in your bag.",
      };
  }
}

function OrderNotFound() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="type-heading">We couldn&apos;t find this order</h1>
      <p className="type-body text-muted-foreground">
        If you completed a payment, it may take a moment to appear. Try this page again shortly.
      </p>
      <Link href="/cart" className="btn btn-secondary">
        Back to your bag
      </Link>
    </div>
  );
}

function ConfirmationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your order" className="flex max-w-3xl flex-col gap-10">
      <div className="flex flex-col gap-3">
        <div className="h-4 w-32 bg-surface" />
        <div className="h-10 w-80 max-w-full bg-surface" />
        <div className="h-5 w-96 max-w-full bg-surface" />
      </div>
      <div className="h-32 border-y bg-surface" />
    </div>
  );
}
