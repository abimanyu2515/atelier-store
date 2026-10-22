import Link from "next/link";
import { BagIcon } from "@/components/icons";
import { getCartCount } from "@/db/queries/cart";
import { getSession } from "@/lib/session";

/** The header bag link with its item count. Render inside <Suspense>. */
export async function BagLink() {
  const session = await getSession();
  const count = session ? await getCartCount(session.user.id) : 0;
  return <BagLinkView count={count} />;
}

/** The link itself; also the Suspense fallback while the count streams in. */
export function BagLinkView({ count = 0 }: { count?: number }) {
  const label =
    count > 0 ? `Shopping bag, ${count} ${count === 1 ? "item" : "items"}` : "Shopping bag, empty";
  return (
    <Link href="/cart" className="btn btn-icon relative" aria-label={label}>
      <BagIcon />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1 min-w-4 bg-foreground px-1 text-center text-2xs leading-4 text-background tabular-nums"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
