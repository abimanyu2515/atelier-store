import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false },
};

// Fully static: the form reads `?next=` in the browser. Signed-in visitors
// are sent to /account by src/proxy.ts.
export default function SignInPage() {
  return (
    <main className="section container-form flex-1">
      <h1 className="type-heading mb-3">Sign in</h1>
      <p className="type-body mb-8 text-muted-foreground md:mb-10">
        Welcome back. Sign in to your Atelier account.
      </p>
      <AuthForm mode="sign-in" />
    </main>
  );
}
