import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section container-narrow flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="type-heading">This page isn’t available</h1>
      <p className="type-body text-muted-foreground">
        The piece you’re looking for may have moved or is no longer in the collection.
      </p>
      <Link href="/#new-in" className="btn btn-primary">
        Shop new arrivals
      </Link>
    </main>
  );
}
