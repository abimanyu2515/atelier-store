import type { Metadata } from "next";
import { Suspense } from "react";
import { DetailList, DetailListSkeleton } from "@/components/detail-list";
import { formatMemberSince } from "@/lib/format";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Account details",
};

export default function AccountDetailsPage() {
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="type-heading">Account details</h1>
        <p className="type-body text-muted-foreground">
          The information saved to your Atelier account.
        </p>
      </header>
      <Suspense fallback={<DetailListSkeleton rows={3} />}>
        <Details />
      </Suspense>
    </div>
  );
}

async function Details() {
  const user = await requireUser("/account/details");

  return (
    <DetailList
      items={[
        { label: "Name", value: user.name },
        { label: "Email", value: user.email },
        { label: "Member since", value: formatMemberSince(user.createdAt) },
      ]}
    />
  );
}
