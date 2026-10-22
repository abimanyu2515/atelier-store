import Link from "next/link";
import { Suspense } from "react";
import { BagLink, BagLinkView } from "@/components/bag-link";
import { SearchIcon, UserIcon } from "@/components/icons";
import { MobileMenu } from "@/components/mobile-menu";
import { navigation } from "@/lib/catalog";

export function SiteHeader() {
  return (
    <>
      <p className="theme-inverse px-gutter py-2 text-center text-xs">
        Complimentary shipping and returns on every order
      </p>
      <header className="site-header">
        <div className="flex items-center">
          <MobileMenu links={navigation} />
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex gap-7">
              {navigation.slice(0, 5).map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="type-label link-reveal">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link
          href="/"
          className="text-lg font-medium tracking-[0.32em] uppercase lg:text-2xl"
        >
          Atelier
        </Link>

        <div className="-mr-3 flex items-center justify-end">
          <Link href="/search" className="btn btn-icon hidden sm:inline-flex" aria-label="Search">
            <SearchIcon />
          </Link>
          {/* Static on purpose: src/proxy.ts sends signed-out visitors to sign-in */}
          <Link href="/account" className="btn btn-icon" aria-label="Account">
            <UserIcon />
          </Link>
          <Suspense fallback={<BagLinkView />}>
            <BagLink />
          </Suspense>
        </div>
      </header>
    </>
  );
}
