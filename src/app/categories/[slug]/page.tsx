import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductListing, ProductListingSkeleton } from "@/components/product-listing";
import { getCategorySlugs, getCategoryWithProducts } from "@/db/queries/catalog";

export async function generateStaticParams() {
  return (await getCategorySlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const category = await getCategoryWithProducts((await params).slug);
  if (!category) return {};
  return {
    title: category.name,
    description: `${category.name} from Atelier, made in Milan.`,
  };
}

// Like the product page, the shell stays URL-independent; everything that
// reads `params` streams in behind Suspense.
export default function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  return (
    <main className="section container-page flex-1">
      <Suspense fallback={<ProductListingSkeleton />}>
        <CategoryProducts params={params} />
      </Suspense>
    </main>
  );
}

async function CategoryProducts({ params }: Pick<PageProps<"/categories/[slug]">, "params">) {
  const category = await getCategoryWithProducts((await params).slug);
  if (!category) notFound();

  return (
    <ProductListing
      title={category.name}
      products={category.products}
      emptyAction={{ href: "/new-arrivals", label: "Shop new arrivals" }}
    />
  );
}
