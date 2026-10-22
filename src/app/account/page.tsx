import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DetailList, DetailListSkeleton } from "@/components/detail-list";
import { formatMemberSince } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Your account",
};

export default function AccountPage() {
  return (
    <div className="flex flex-col gap-10 md:gap-12">
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>

      <section aria-labelledby="continue-title" className="flex flex-col items-start gap-4">
        <h2 id="continue-title" className="type-title">
          Continue shopping
        </h2>
        <p className="type-body text-muted-foreground">
          See what has just arrived from the atelier in Milan.
        </p>
        <Link href="/new-arrivals" className="btn btn-secondary">
          Shop new arrivals
        </Link>
      </section>
    </div>
  );
}

async function Overview() {
  const user = await requireUser("/account");
  const firstName = user.name.trim().split(/\s+/)[0];

  return (
    <>
      <header className="flex flex-col gap-3">
        <h1 className="type-heading wrap-break-word">Hello, {firstName}</h1>
        <p className="type-body text-muted-foreground">
          Member since {formatMemberSince(user.createdAt)}
        </p>
      </header>

      <section aria-labelledby="details-title" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="details-title" className="type-title">
            Account details
          </h2>
          <Link href="/account/details" className="btn btn-ghost">
            View all
          </Link>
        </div>
        <DetailList
          items={[
            { label: "Name", value: user.name },
            { label: "Email", value: user.email },
          ]}
        />
      </section>
    </>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div aria-busy="true" aria-label="Loading your account" className="flex flex-col gap-3">
        <div className="h-10 w-64 max-w-full bg-surface" />
        <div className="h-5 w-40 bg-surface" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="h-6 w-36 bg-surface" />
        <DetailListSkeleton rows={2} />
      </div>
    </>
  );
}
