import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { OrderStatus } from "@/components/order-status";
import { getCustomerOrders } from "@/db/queries/orders";
import { centsToPrice } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { formatDate, formatOrderNumber } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Orders",
};

export default function OrdersPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="type-heading">Orders</h1>
        <p className="type-body text-muted-foreground">Everything you have ordered from Atelier.</p>
      </header>
      <Suspense fallback={<OrderListSkeleton />}>
        <OrderList />
      </Suspense>
    </div>
  );
}

async function OrderList() {
  // Only the signed-in customer's own orders are ever queried.
  const user = await requireUser("/account/orders");
  const orders = await getCustomerOrders(user.id);

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 border-t pt-8">
        <p className="type-body text-muted-foreground">You haven&apos;t placed any orders yet.</p>
        <Link href="/new-arrivals" className="btn btn-secondary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y border-y" aria-label="Your orders">
      {orders.map((order) => (
        <li
          key={order.id}
          // Number and date, then status below them; total on the right. From
          // sm, status gets its own column and a "View" cue appears.
          className="group relative grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-2 py-5 sm:grid-cols-[minmax(0,1fr)_11rem_7rem_auto]"
        >
          <div className="flex min-w-0 flex-col gap-1">
            {/* The link's ::after covers the row, so the whole row is clickable. */}
            <Link
              href={`/account/orders/${order.id}`}
              className="type-body after:absolute after:inset-0 group-hover:underline group-hover:underline-offset-4"
            >
              Order {formatOrderNumber(order.id)}
            </Link>
            <p className="type-caption">
              <time dateTime={order.createdAt.toISOString()}>{formatDate(order.createdAt)}</time>
              {` · ${order.itemCount} ${order.itemCount === 1 ? "piece" : "pieces"}`}
            </p>
          </div>
          <OrderStatus status={order.status} className="row-start-2 sm:row-start-auto" />
          <p className="type-price col-start-2 row-start-1 text-right sm:col-start-auto sm:row-start-auto">
            {formatPrice(centsToPrice(order.totalCents))}
          </p>
          <span className="type-label hidden text-muted-foreground group-hover:text-foreground sm:block" aria-hidden="true">
            View
          </span>
        </li>
      ))}
    </ul>
  );
}

function OrderListSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your orders" className="divide-y border-y">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex justify-between gap-6 py-5">
          <div className="flex flex-col gap-2">
            <div className="h-5 w-36 bg-surface" />
            <div className="h-4 w-48 max-w-full bg-surface" />
          </div>
          <div className="h-5 w-16 bg-surface" />
        </div>
      ))}
    </div>
  );
}
