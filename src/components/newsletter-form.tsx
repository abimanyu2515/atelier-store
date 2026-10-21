"use client";

import { useActionState } from "react";
import { subscribeToNewsletter, type NewsletterState } from "@/lib/newsletter-actions";

const initialState: NewsletterState = { status: "idle" };

export function NewsletterForm() {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);

  return (
    // A server action posts the address in the request body, so it never
    // reaches the URL. This works without JavaScript too.
    <form
      className="flex max-w-sm flex-col gap-4 md:col-span-3 lg:col-span-1"
      action={formAction}
    >
      <h2 className="type-title">Sign up for updates</h2>
      <p className="type-body text-muted-foreground">
        New collections, private sales and invitations to atelier events, sent
        twice a month.
      </p>
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex">
        <input
          id="footer-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Email address"
          className="field border-border"
          aria-invalid={state.status === "error" || undefined}
          aria-describedby="footer-email-status"
        />
        <button
          type="submit"
          className="btn btn-secondary shrink-0 border-l-0"
          disabled={pending}
        >
          Sign up
        </button>
      </div>
      <p id="footer-email-status" role="status" className="text-xs empty:hidden">
        {state.status === "success" && "Thank you. You're on the list."}
        {state.status === "error" && <span className="text-danger">{state.message}</span>}
      </p>
    </form>
  );
}
