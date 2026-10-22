"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/lib/auth-actions";

const links = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/details", label: "Account details" },
] as const;

// Overview matches only itself; other sections stay current on their sub-pages.
function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/account" && pathname.startsWith(`${href}/`));
}

/**
 * Account section navigation: a scrollable tab row on small screens, a
 * vertical list beside the content from lg. `children` adds extra items
 * (e.g. the admin link) before sign-out.
 */
export function AccountNav({ children }: { children?: ReactNode }) {
  return (
    <nav aria-label="Account">
      <ul className="-mx-gutter flex gap-6 overflow-x-auto border-b px-gutter lg:mx-0 lg:flex-col lg:items-start lg:gap-4 lg:overflow-visible lg:border-b-0 lg:px-0">
        {links.map((link) => (
          <li key={link.href} className="shrink-0">
            {/* Under a dynamic route such as /account/orders/[id] the pathname
                isn't known while prerendering, so usePathname suspends. The
                fallback is the same link without the current-page state. */}
            <Suspense fallback={<NavLink href={link.href} label={link.label} current={false} />}>
              <CurrentNavLink href={link.href} label={link.label} />
            </Suspense>
          </li>
        ))}
        {children}
        <li className="shrink-0 lg:mt-4 lg:w-full lg:border-t lg:pt-6">
          {/* A server action: signing out works without JavaScript. */}
          <form action={signOut}>
            <button type="submit" className="type-label link-muted cursor-pointer py-4 lg:py-0">
              Sign out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}

function CurrentNavLink({ href, label }: { href: string; label: string }) {
  return <NavLink href={href} label={label} current={isCurrent(usePathname(), href)} />;
}

function NavLink({ href, label, current }: { href: string; label: string; current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className="type-label link-reveal inline-block py-4 lg:py-0"
    >
      {label}
    </Link>
  );
}

/** Extra nav item in the same style, for links rendered on the server. */
export function AccountNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li className="shrink-0">
      <Link href={href} className="type-label link-reveal inline-block py-4 lg:py-0">
        {children}
      </Link>
    </li>
  );
}
