import { count } from "drizzle-orm";
import type { Metadata } from "next";
import { Suspense } from "react";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false },
};

// src/proxy.ts turns away non-admins before rendering; requireAdmin is the
// authoritative check. Every admin server action must call it too.
export default function AdminPage() {
  return (
    <main className="section container-page flex-1">
      <h1 className="type-heading mb-8">Admin</h1>
      <Suspense fallback={<div aria-busy="true" className="h-24 bg-surface" />}>
        <AdminHome />
      </Suspense>
    </main>
  );
}

async function AdminHome() {
  const admin = await requireAdmin();
  const [{ accounts }] = await db.select({ accounts: count() }).from(user);

  return (
    <div className="type-body flex flex-col gap-2">
      <p>Signed in as {admin.email}.</p>
      <p className="text-muted-foreground">
        {accounts} registered {accounts === 1 ? "account" : "accounts"}.
      </p>
    </div>
  );
}
