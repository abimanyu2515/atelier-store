import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false },
};

// Fully static: the form reads `?next=` in the browser. Signed-in visitors
// are sent to /account by src/proxy.ts.
export default function SignUpPage() {
  return (
    <main className="section container-form flex-1">
      <h1 className="type-heading mb-3">Create an account</h1>
      <p className="type-body mb-8 text-muted-foreground md:mb-10">
        Keep your details in one place for every visit to Atelier.
      </p>
      <AuthForm mode="sign-up" />
    </main>
  );
}
