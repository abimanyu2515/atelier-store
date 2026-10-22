"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { addToCart, type AddToCartState } from "@/lib/cart-actions";
import type { Product } from "@/lib/catalog";

type Props = {
  slug: string;
  sizes: Product["sizes"];
  soldOut: boolean;
};

const initialState: AddToCartState = { status: "idle" };

// Only the slug, size and quantity are posted; addToCart reads price and
// stock itself, so `soldOut` here (from the cached catalog) is a hint only.
export function PurchaseForm({ slug, sizes, soldOut }: Props) {
  const [size, setSize] = useState<string | null>(null);
  const [missingSize, setMissingSize] = useState(false);
  const [state, formAction, pending] = useActionState(addToCart, initialState);

  // Submitted from onSubmit rather than <form action>: React resets a form
  // after its action runs, which would clear the checked size in the DOM
  // while `size` state still holds it.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sizes && !size) {
      setMissingSize(true);
      return;
    }
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("quantity", "1");
    if (size) formData.set("size", size);
    startTransition(() => formAction(formData));
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {sizes && (
        <fieldset
          className="flex flex-col gap-3"
          disabled={soldOut}
          aria-describedby={missingSize ? "size-error" : undefined}
        >
          <div className="flex items-baseline justify-between">
            <legend className="type-body">Size ({sizes.system})</legend>
            <a href="#" className="link type-caption">
              Size guide
            </a>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-1">
            {sizes.values.map((value) => (
              <label
                key={value}
                className="flex h-11 cursor-pointer items-center justify-center border border-border text-sm tabular-nums transition-colors duration-200 ease-luxe hover:border-border-strong has-checked:border-border-strong has-checked:bg-foreground has-checked:text-background has-focus-visible:outline has-focus-visible:outline-offset-2 has-disabled:cursor-not-allowed has-disabled:text-muted-foreground has-disabled:line-through has-disabled:hover:border-border"
              >
                <input
                  type="radio"
                  name="size"
                  value={value}
                  className="sr-only"
                  checked={size === value}
                  onChange={() => {
                    setSize(value);
                    setMissingSize(false);
                  }}
                />
                {value}
              </label>
            ))}
          </div>
          {missingSize && (
            <p id="size-error" role="alert" className="text-xs text-danger">
              Select a size to add this to your bag.
            </p>
          )}
        </fieldset>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-lg w-full"
        disabled={soldOut || pending}
      >
        {soldOut ? "Sold out" : pending ? "Adding…" : "Add to bag"}
      </button>
      <p role="status" className="flex flex-wrap items-baseline justify-between gap-2 text-xs empty:hidden">
        {state.status === "added" && (
          <>
            <span>{state.message}</span>
            <Link href="/cart" className="link">
              View bag
            </Link>
          </>
        )}
        {state.status === "error" && <span className="text-danger">{state.message}</span>}
      </p>
    </form>
  );
}
