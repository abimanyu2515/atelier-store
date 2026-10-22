"use client";

import { useActionState } from "react";
import { startCheckout, type CheckoutState } from "@/lib/checkout-actions";

type Props = { disabled: boolean };

const initialState: CheckoutState = { error: null };

// Posts nothing but the request: startCheckout reads the bag, prices and
// stock on the server, then redirects to Stripe.
export function CheckoutButton({ disabled }: Props) {
  const [state, formAction, pending] = useActionState(startCheckout, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <button type="submit" className="btn btn-primary btn-lg w-full" disabled={disabled || pending}>
        {pending ? "Opening checkout…" : "Checkout"}
      </button>
      <p role="status" className="text-xs text-danger empty:hidden">
        {state.error}
      </p>
    </form>
  );
}
