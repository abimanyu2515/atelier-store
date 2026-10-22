import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/catalog";

type Props = {
  title: string;
  description?: string;
  products: Product[];
  /** Where to send shoppers when the listing is empty. */
  emptyAction: { href: string; label: string };
};

/** Breadcrumbed page header and product grid for collection pages. */
export function ProductListing({ title, description, products, emptyAction }: Props) {
  return (
    <>
      <div className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-xl flex-col gap-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap gap-2 type-caption">
              <li>
                <Link href="/" className="link-muted">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
          <h1 className="type-heading">{title}</h1>
          {description && <p className="type-body text-muted-foreground">{description}</p>}
        </div>
        {products.length > 0 && (
          <p className="type-caption">
            {products.length} {products.length === 1 ? "piece" : "pieces"}
          </p>
        )}
      </div>

      {products.length > 0 ? (
        <div className="product-grid -mx-gutter lg:mx-0">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-6 py-16 text-center">
          <p className="type-body text-muted-foreground">
            New pieces are on their way. In the meantime, explore the current collection.
          </p>
          <Link href={emptyAction.href} className="btn btn-primary">
            {emptyAction.label}
          </Link>
        </div>
      )}
    </>
  );
}

/** Placeholder with the listing's shape while its data streams in. */
export function ProductListingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products">
      <div className="mb-8 flex flex-col gap-3 md:mb-12">
        <div className="h-4 w-32 bg-surface" />
        <div className="h-10 w-64 max-w-full bg-surface" />
      </div>
      <div className="product-grid -mx-gutter lg:mx-0">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="media-frame" />
        ))}
      </div>
    </div>
  );
}
