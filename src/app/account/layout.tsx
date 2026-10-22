import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountNav, AccountNavLink } from "@/components/account-nav";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  robots: { index: false },
};

// The shell and navigation are static. Each page streams its own
// user-specific content and calls requireUser itself; src/proxy.ts has
// already redirected signed-out visitors.
export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <main className="section container-page flex-1">
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-16 xl:gap-24">
        <aside className="lg:pt-2">
          <p className="type-label mb-6 hidden text-muted-foreground lg:block">My account</p>
          <AccountNav>
            <Suspense fallback={null}>
              <AdminLink />
            </Suspense>
          </AccountNav>
        </aside>
        <div className="min-w-0 max-w-2xl">{children}</div>
      </div>
    </main>
  );
}

async function AdminLink() {
  const session = await getSession();
  if (session?.user.role !== "admin") return null;
  return <AccountNavLink href="/admin">Admin</AccountNavLink>;
}
