import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductCard } from "@/components/product-card";
import { PurchaseForm } from "@/components/purchase-form";
import { getProduct, getProductSlugs, getRelatedProducts } from "@/db/queries/catalog";
import { formatPrice, getStockState, type StockState } from "@/lib/catalog";

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.description };
}

const stockDot: Record<StockState["status"], string> = {
  "in-stock": "bg-success",
  "low-stock": "bg-accent",
  "sold-out": "bg-muted-foreground",
};

// The page itself stays URL-independent so it can be the shared App Shell;
// everything that reads `params` streams in behind Suspense.
export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails params={params} />
      </Suspense>
    </main>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid lg:grid-cols-2" aria-busy="true" aria-label="Loading product">
      <div className="aspect-product w-[85%] bg-surface md:w-[55%] lg:w-full" />
      <div className="px-gutter py-8 lg:py-16">
        <div className="mx-auto flex max-w-md flex-col gap-4">
          <div className="h-4 w-24 bg-surface" />
          <div className="h-10 w-3/4 bg-surface" />
          <div className="h-5 w-20 bg-surface" />
          <div className="mt-6 h-14 w-full bg-surface" />
        </div>
      </div>
    </div>
  );
}

async function ProductDetails({ params }: Pick<PageProps<"/products/[slug]">, "params">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const stock = getStockState(product.stock);
  const related = await getRelatedProducts(product);

  return (
    <>
      <article className="grid lg:grid-cols-2">
        {/* Gallery: swipeable strip on small screens, stacked column from lg */}
        <div className="min-w-0">
          <ul
            className="flex snap-x snap-mandatory gap-(--grid-gap-x) overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible"
            aria-label={`${product.name} images`}
          >
            {product.images.map((image, i) => (
              <li
                key={image.src}
                className="relative aspect-product w-[85%] shrink-0 snap-start bg-surface md:w-[55%] lg:w-full"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  sizes="(width >= 64rem) 50vw, (width >= 48rem) 55vw, 85vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </div>

        {/* Product information stays in view while the gallery scrolls */}
        <div className="px-gutter py-8 lg:py-0">
          <div className="mx-auto flex max-w-md flex-col gap-8 lg:sticky lg:top-header lg:py-16">
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap gap-2 type-caption">
                <li>
                  <Link href="/" className="link-muted">
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href={`/categories/${product.categorySlug}`} className="link-muted">
                    {product.category}
                  </Link>
                </li>
              </ol>
            </nav>

            <div className="flex flex-col gap-3">
              {product.badge && (
                <p className="type-label text-accent">{product.badge}</p>
              )}
              <h1 className="type-heading">{product.name}</h1>
              <p className="type-price text-base">{formatPrice(product.price)}</p>
            </div>

            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Color</dt>
                <dd>{product.color}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="sr-only">Availability</dt>
                <dd className="flex items-center gap-2">
                  <span className={`size-1.5 ${stockDot[stock.status]}`} aria-hidden="true" />
                  {stock.label}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-4">
              <PurchaseForm slug={product.slug} sizes={product.sizes} soldOut={stock.status === "sold-out"} />
              <Link href="/#appointment" className="btn btn-secondary w-full">
                Book an appointment to try it on
              </Link>
            </div>

            <p className="type-body">{product.description}</p>

            <div className="border-t">
              <details className="group border-b" open>
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 type-body [&::-webkit-details-marker]:hidden">
                  Details
                  <span aria-hidden="true" className="text-lg leading-none group-open:rotate-45 transition-transform duration-200 ease-luxe">
                    +
                  </span>
                </summary>
                <ul className="flex list-disc flex-col gap-1 pb-5 pl-4 type-body text-muted-foreground">
                  {product.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </details>
              <details className="group border-b">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 type-body [&::-webkit-details-marker]:hidden">
                  Shipping and returns
                  <span aria-hidden="true" className="text-lg leading-none group-open:rotate-45 transition-transform duration-200 ease-luxe">
                    +
                  </span>
                </summary>
                <div className="flex flex-col gap-2 pb-5 type-body text-muted-foreground">
                  <p>Complimentary express shipping, delivered in 2–4 business days.</p>
                  <p>Return or exchange within 30 days of delivery, free of charge.</p>
                </div>
              </details>
            </div>
          </div>
        </div>
      </article>

      <section className="section container-page" aria-labelledby="related-title">
        <h2 id="related-title" className="type-heading mb-8 md:mb-12">
          You may also like
        </h2>
        <div className="product-grid -mx-gutter lg:mx-0">
          {related.map((item) => (
            <ProductCard key={item.slug} product={item} />
          ))}
        </div>
      </section>
    </>
  );
}
