"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseIcon, MenuIcon } from "@/components/icons";

type Props = {
  links: { label: string; href: string }[];
};

export function MobileMenu({ links }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-icon -ml-3 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
      </button>

      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        hidden={!open}
        className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
      >
        <div className="flex h-header items-center border-b px-gutter">
          <button
            type="button"
            className="btn btn-icon -ml-3"
            aria-label="Close menu"
            autoFocus
            onClick={() => setOpen(false)}
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-gutter py-8">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="block py-3 text-2xl tracking-tight"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-col gap-3 border-t px-gutter py-6">
          <Link href="/search" className="link-muted" onClick={() => setOpen(false)}>
            Search
          </Link>
          <a href="#" className="link-muted">
            Sign in
          </a>
          <Link href="/#appointment" className="link-muted" onClick={() => setOpen(false)}>
            Book an appointment
          </Link>
        </div>
      </div>
    </>
  );
}
