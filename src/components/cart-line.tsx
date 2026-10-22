"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { centsToPrice, CART_QUANTITY_MAX, type CartSummary } from "@/lib/cart";
import { removeCartItem, updateCartItem, type CartLineResult } from "@/lib/cart-actions";
import { formatPrice } from "@/lib/catalog";

type Props = { line: CartSummary["lines"][number] };

// Sends only the line id and the new quantity. The server caps it at live
// stock and re-renders the bag with refresh().
export function CartLine({ line }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const max = Math.min(line.available, CART_QUANTITY_MAX);
  const href = `/products/${line.slug}`;

  function run(action: () => Promise<CartLineResult>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.message) setMessage(result.message);
    });
  }

  // Matches what the subtotal counts (see summarizeCart).
  const stockNote =
    line.purchasable === line.quantity
      ? null
      : line.stock === 0
        ? "Sold out. Remove it to continue."
        : line.purchasable === 0
          ? "The remaining stock is already in your bag in another size."
          : `Only ${line.purchasable} available.`;
  const note = message ?? stockNote;

  return (
    <li className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-6">
      <Link href={href} className="relative aspect-product bg-surface" tabIndex={-1} aria-hidden="true">
        {line.image && (
          <Image
            src={line.image.src}
            alt=""
            fill
            sizes="(width >= 40rem) 8rem, 6rem"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-4" aria-busy={pending || undefined}>
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="type-body">
              <Link href={href} className="hover:underline hover:underline-offset-4">
                {line.name}
              </Link>
            </h2>
            <p className="type-caption">
              {line.color}
              {line.size && ` · Size ${line.size.value} (${line.size.system})`}
            </p>
          </div>
          <p className="type-price shrink-0 sm:text-right">
            {formatPrice(centsToPrice(line.unitPriceCents * line.purchasable))}
            {line.quantity > 1 && (
              <span className="block type-caption">
                {formatPrice(centsToPrice(line.unitPriceCents))} each
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            className="flex items-center border border-border"
            role="group"
            aria-label={`Quantity of ${line.name}`}
          >
            <button
              type="button"
              className="btn btn-icon text-base"
              aria-label="Decrease quantity"
              disabled={pending || line.quantity <= 1}
              // Above stock, one press drops straight to what is available.
              onClick={() =>
                run(() => updateCartItem(line.id, Math.max(1, Math.min(line.quantity - 1, max))))
              }
            >
              −
            </button>
            <output className="min-w-8 text-center text-sm tabular-nums">{line.quantity}</output>
            <button
              type="button"
              className="btn btn-icon text-base"
              aria-label="Increase quantity"
              disabled={pending || line.quantity >= max}
              onClick={() => run(() => updateCartItem(line.id, line.quantity + 1))}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => run(() => removeCartItem(line.id))}
          >
            Remove
          </button>
        </div>

        <p role="status" className="text-xs text-danger empty:hidden">
          {note}
        </p>
      </div>
    </li>
  );
}
