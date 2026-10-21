"use server";

// The newsletter form posts here so the address travels in the request body.
// A GET form would put it in the URL, browser history and access logs. Never
// log or echo the raw address.

export type NewsletterState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeToNewsletter(
  _previous: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const email = formData.get("email");
  if (
    typeof email !== "string" ||
    email.trim().length > EMAIL_MAX_LENGTH ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return { status: "error", message: "Enter a valid email address." };
  }

  // Subscriber storage doesn't exist yet; save `email.trim().toLowerCase()` here.
  return { status: "success" };
}
