import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartLine } from "@/components/cart-line";
import { CheckoutButton } from "@/components/checkout-button";
import { getCart } from "@/db/queries/cart";
import { centsToPrice, summarizeCart } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your bag",
  robots: { index: false },
};

// The heading is static; the bag streams in behind Suspense because it reads
// the session. src/proxy.ts has already redirected signed-out visitors.
export default function CartPage() {
  return (
    <main className="section container-page flex-1">
      <h1 className="type-heading mb-8 md:mb-12">Your bag</h1>
      <Suspense fallback={<CartSkeleton />}>
        <CartContents />
      </Suspense>
    </main>
  );
}

async function CartContents() {
  const user = await requireUser("/cart");
  const lines = await getCart(user.id);

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 border-t pt-8">
        <p className="type-body text-muted-foreground">Your bag is empty.</p>
        <Link href="/new-arrivals" className="btn btn-secondary">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  const cart = summarizeCart(lines);

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16 xl:gap-24">
      <ul className="divide-y border-y" aria-label="Items in your bag">
        {cart.lines.map((line) => (
          <CartLine key={line.id} line={line} />
        ))}
      </ul>

      <aside
        aria-labelledby="summary-title"
        className="flex flex-col gap-6 lg:sticky lg:top-header lg:self-start"
      >
        <h2 id="summary-title" className="type-title">
          Summary
        </h2>
        <dl className="flex flex-col gap-3 border-y py-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt>
              Subtotal{" "}
              <span className="text-muted-foreground">
                ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
              </span>
            </dt>
            <dd className="type-price">{formatPrice(centsToPrice(cart.subtotalCents))}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Shipping</dt>
            <dd>Complimentary</dd>
          </div>
        </dl>
        {cart.hasStockIssues && (
          <p className="text-xs text-danger">
            Some pieces have less stock than your bag holds. The subtotal counts only what is
            available. Adjust your bag to check out.
          </p>
        )}
        <CheckoutButton disabled={cart.hasStockIssues} />
      </aside>
    </div>
  );
}

function CartSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your bag" className="divide-y border-y">
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6"
        >
          <div className="aspect-product bg-surface" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-48 max-w-full bg-surface" />
            <div className="h-4 w-24 bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}
