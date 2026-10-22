import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailListSkeleton } from "@/components/detail-list";
import { orderStatusLabel } from "@/components/order-status";
import { OrderDetails, OrderItems } from "@/components/order-summary";
import { getOrderForCustomer, getOrderItems, isPlacedOrder } from "@/db/queries/orders";
import { formatDate, formatOrderNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Order details",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The order id is runtime data, so everything but the back link streams in.
export default function OrderPage({ params }: PageProps<"/account/orders/[id]">) {
  return (
    <div className="flex flex-col gap-8">
      <Link href="/account/orders" className="type-label link-muted self-start">
        ← All orders
      </Link>
      <Suspense fallback={<OrderSkeleton />}>
        {params.then(({ id }) => (
          <OrderContents id={id} />
        ))}
      </Suspense>
    </div>
  );
}

async function OrderContents({ id }: { id: string }) {
  const user = await requireUser(`/account/orders/${encodeURIComponent(id)}`);
  // Scoped to the signed-in customer: another customer's order id is a 404.
  const order = UUID_PATTERN.test(id) ? await getOrderForCustomer(user.id, id) : undefined;
  if (!order || !isPlacedOrder(order)) notFound();
  const items = await getOrderItems(order.id);

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="type-heading">Order {formatOrderNumber(order.id)}</h1>
        <p className="type-body text-muted-foreground">
          Placed <time dateTime={order.createdAt.toISOString()}>{formatDate(order.createdAt)}</time>
        </p>
      </header>

      <OrderDetails
        order={order}
        before={[
          { label: "Payment status", value: orderStatusLabel(order.status) },
          ...(order.paidAt ? [{ label: "Paid on", value: formatDate(order.paidAt) }] : []),
        ]}
      />

      <section aria-labelledby="items-title" className="flex flex-col gap-4">
        <h2 id="items-title" className="type-title">
          Items
        </h2>
        <OrderItems items={items} />
      </section>
    </>
  );
}

function OrderSkeleton() {
  return (
    <>
      <div aria-busy="true" aria-label="Loading your order" className="flex flex-col gap-3">
        <div className="h-10 w-64 max-w-full bg-surface" />
        <div className="h-5 w-40 bg-surface" />
      </div>
      <DetailListSkeleton rows={3} />
    </>
  );
}
