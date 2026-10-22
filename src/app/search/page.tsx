import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { SearchForm } from "@/components/search-form";
import { getNewArrivals, normalizeSearchQuery, searchProducts } from "@/db/queries/catalog";

export const metadata: Metadata = {
  title: "Search",
  // Result pages are thin and endless; keep them out of search engines.
  robots: { index: false },
};

// The shell stays query-independent; the form and results read `searchParams`
// and stream in behind Suspense.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="section container-page flex-1">
      <h1 className="type-heading mb-6 md:mb-8">Search</h1>
      <Suspense fallback={<SearchSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function SearchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading results">
      <div className="mb-8 h-12 w-full max-w-xl bg-surface md:mb-12" />
      <div className="product-grid -mx-gutter lg:mx-0">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="media-frame" />
        ))}
      </div>
    </div>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const query = normalizeSearchQuery((await searchParams).q);
  const results = query ? await searchProducts(query) : [];

  return (
    <>
      {/* Keyed so the field resets to the URL's query on back/forward */}
      <div className="mb-8 md:mb-12">
        <SearchForm key={query} defaultValue={query} />
      </div>

      {query && (
        <p role="status" className="type-caption mb-6">
          {results.length} {results.length === 1 ? "result" : "results"} for “{query}”
        </p>
      )}

      {results.length > 0 ? (
        <div className="product-grid -mx-gutter lg:mx-0">
          {results.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      ) : (
        <Suggestions searched={query !== ""} />
      )}
    </>
  );
}

/** Shown before a search and when nothing matches. */
async function Suggestions({ searched }: { searched: boolean }) {
  const products = await getNewArrivals(4);

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      {searched && (
        <p className="type-body max-w-md text-muted-foreground">
          Nothing matched your search. Try another word, or browse{" "}
          <Link href="/#categories" className="link">
            the categories
          </Link>
          .
        </p>
      )}
      {products.length > 0 && (
        <section aria-labelledby="suggestions-title">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="suggestions-title" className="type-title">
              New arrivals
            </h2>
            <Link href="/new-arrivals" className="btn btn-ghost">
              View all
            </Link>
          </div>
          <div className="product-grid -mx-gutter lg:mx-0">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
