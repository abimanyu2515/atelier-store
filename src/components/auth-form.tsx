"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useState,
  useTransition,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-next";

// These requests go through /api/auth so Better Auth rate-limits them and
// checks their origin; a server action calling `auth.api` would skip both.
// Client checks here are for guidance only; the server re-validates.

type Mode = "sign-in" | "sign-up";
type FieldName = "name" | "email" | "password";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type FormError = { message: string; link?: { href: string; label: string } };
type AuthError = { status: number; code?: string };

const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Match emailAndPassword in src/lib/auth.ts.
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 128;

const copy = {
  "sign-in": {
    fields: ["email", "password"],
    submit: "Sign in",
    pending: "Signing in…",
    switchPrompt: "New to Atelier?",
    switchLabel: "Create an account",
    switchHref: "/sign-up",
  },
  "sign-up": {
    fields: ["name", "email", "password"],
    submit: "Create account",
    pending: "Creating account…",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/sign-in",
  },
} satisfies Record<Mode, { fields: FieldName[] } & Record<string, unknown>>;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Values>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<FormError | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const { fields, submit, pending: pendingLabel } = copy[mode];
  const isSignUp = mode === "sign-up";

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as FieldName;
    const value = event.target.value;
    setValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
    // Once a field shows an error, re-check as the user types so it clears
    // the moment the value is fixed.
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: validate(mode, field, value) }));
    }
  }

  function onBlur(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as FieldName;
    // Don't scold an empty field the user merely tabbed through.
    if (event.target.value === "") return;
    setErrors((current) => ({ ...current, [field]: validate(mode, field, event.target.value) }));
  }

  function onPasswordKey(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;

    const nextErrors: Errors = {};
    for (const field of fields) {
      const error = validate(mode, field, values[field]);
      if (error) nextErrors[field] = error;
    }
    setErrors(nextErrors);
    setFormError(null);
    const firstInvalid = fields.find((field) => nextErrors[field]);
    if (firstInvalid) {
      focusField(form, firstInvalid);
      return;
    }

    // Read at submit time so the form itself needs no request data to render.
    const destination = safeNext(new URLSearchParams(window.location.search).get("next"));
    const email = values.email.trim();

    startTransition(async () => {
      let error: AuthError | null;
      try {
        ({ error } = isSignUp
          ? await authClient.signUp.email({ name: values.name.trim(), email, password: values.password })
          : await authClient.signIn.email({ email, password: values.password }));
      } catch {
        error = { status: 0 };
      }

      if (error) {
        const outcome = describeError(mode, error);
        if ("field" in outcome) {
          setErrors({ [outcome.field]: outcome.message });
          focusField(form, outcome.field);
        } else {
          setFormError(outcome);
        }
        return;
      }
      // Stays pending until the destination has rendered.
      router.replace(destination);
      router.refresh();
    });
  }

  function inputProps(field: FieldName) {
    const describedBy = [
      `auth-${field}-message`,
      field === "password" && capsLock ? "auth-capslock" : null,
    ].filter(Boolean);
    return {
      id: `auth-${field}`,
      name: field,
      value: values[field],
      onChange,
      onBlur,
      readOnly: pending,
      className: "field",
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy.join(" "),
    } as const;
  }

  return (
    // method="post": if this is submitted before hydration, the password must
    // not end up in the URL, browser history and access logs.
    <form method="post" className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      {isSignUp && (
        <div className="flex flex-col gap-2">
          <label htmlFor="auth-name" className="type-label">
            Name
          </label>
          <input
            {...inputProps("name")}
            autoComplete="name"
            autoCapitalize="words"
            maxLength={NAME_MAX_LENGTH}
          />
          <FieldMessage id="auth-name-message" error={errors.name} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="auth-email" className="type-label">
          Email
        </label>
        <input
          {...inputProps("email")}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={EMAIL_MAX_LENGTH}
        />
        <FieldMessage id="auth-email-message" error={errors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="auth-password" className="type-label">
          Password
        </label>
        <div className="relative">
          <input
            {...inputProps("password")}
            type={showPassword ? "text" : "password"}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            autoCapitalize="none"
            spellCheck={false}
            maxLength={PASSWORD_MAX_LENGTH}
            onKeyDown={onPasswordKey}
            onKeyUp={onPasswordKey}
            className="field pr-12"
          />
          <button
            type="button"
            className="btn btn-icon absolute inset-y-0 right-0 my-auto text-muted-foreground hover:text-foreground"
            aria-label="Show password"
            aria-pressed={showPassword}
            aria-controls="auth-password"
            onClick={() => setShowPassword((shown) => !shown)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        <FieldMessage
          id="auth-password-message"
          error={errors.password}
          hint={isSignUp ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
        />
        {capsLock && (
          <p id="auth-capslock" className="type-caption">
            Caps Lock is on.
          </p>
        )}
      </div>

      {formError && (
        <div role="alert" className="border-l-2 border-danger py-1 pl-4 text-sm">
          <p>{formError.message}</p>
          {formError.link && (
            <Link href={formError.link.href} className="link mt-1 inline-block">
              {formError.link.label}
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-col gap-4">
        <button type="submit" className="btn btn-primary btn-lg w-full" aria-busy={pending}>
          {pending && (
            <span
              aria-hidden="true"
              className="size-3 animate-spin rounded-full border border-current border-t-transparent"
            />
          )}
          {pending ? pendingLabel : submit}
        </button>
        {/* The form submits through JavaScript; say so rather than fail silently. */}
        <noscript>
          <p className="type-caption">Enable JavaScript in your browser to continue.</p>
        </noscript>
      </div>

      <Suspense fallback={<SwitchLink mode={mode} />}>
        <SwitchLinkWithNext mode={mode} />
      </Suspense>
    </form>
  );
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={id} className="text-xs text-danger">
        {error}
      </p>
    );
  }
  return (
    <p id={id} className="type-caption empty:hidden">
      {hint}
    </p>
  );
}

/** Carries `?next=` across to the other form so the round trip isn't lost. */
function SwitchLinkWithNext({ mode }: { mode: Mode }) {
  const next = useSearchParams().get("next");
  return <SwitchLink mode={mode} next={next ? safeNext(next) : undefined} />;
}

function SwitchLink({ mode, next }: { mode: Mode; next?: string }) {
  const { switchPrompt, switchLabel, switchHref } = copy[mode];
  const href = next ? `${switchHref}?next=${encodeURIComponent(next)}` : switchHref;
  return (
    <p className="type-body border-t pt-6 text-muted-foreground">
      {switchPrompt}{" "}
      <Link href={href} className="link text-foreground">
        {switchLabel}
      </Link>
    </p>
  );
}

function validate(mode: Mode, field: FieldName, value: string): string | undefined {
  switch (field) {
    case "name":
      if (value.trim() === "") return "Enter your name.";
      if (value.trim().length > NAME_MAX_LENGTH) {
        return `Use ${NAME_MAX_LENGTH} characters or fewer.`;
      }
      return;
    case "email":
      if (value.trim() === "") return "Enter your email address.";
      if (value.trim().length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value.trim())) {
        return "Enter a valid email address, like name@example.com.";
      }
      return;
    case "password":
      if (value === "") return mode === "sign-up" ? "Create a password." : "Enter your password.";
      // Sign-in doesn't enforce the minimum: it may change after accounts exist.
      if (mode === "sign-up" && value.length < PASSWORD_MIN_LENGTH) {
        return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
      }
      if (value.length > PASSWORD_MAX_LENGTH) {
        return `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`;
      }
      return;
  }
}

function describeError(
  mode: Mode,
  error: AuthError,
): FormError | { field: FieldName; message: string } {
  if (error.status === 0) {
    return { message: "We couldn't reach Atelier. Check your connection and try again." };
  }
  if (error.status === 429) {
    return { message: "Too many attempts. Wait a few seconds, then try again." };
  }
  if (mode === "sign-in") {
    // Never say which of the two was wrong.
    return error.status === 401
      ? { message: "That email and password don't match an account." }
      : { message: "We couldn't sign you in. Please try again." };
  }
  switch (error.code) {
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        message: "An account with this email already exists.",
        link: { href: "/sign-in", label: "Sign in instead" },
      };
    case "INVALID_EMAIL":
      return { field: "email", message: "Enter a valid email address, like name@example.com." };
    case "PASSWORD_TOO_SHORT":
      return { field: "password", message: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
    case "PASSWORD_TOO_LONG":
      return { field: "password", message: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.` };
    default:
      return { message: "We couldn't create your account. Please try again." };
  }
}

function focusField(form: HTMLFormElement, field: FieldName) {
  const element = form.elements.namedItem(field);
  if (element instanceof HTMLInputElement) element.focus();
}
