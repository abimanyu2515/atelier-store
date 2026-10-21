import {
  asc,
  isNotNull,
  type BuildQueryResult,
  type ExtractTablesWithRelations,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import type * as schema from "@/db/schema";
import { categories, productImages, products } from "@/db/schema";
import type { Category, Product } from "@/lib/catalog";

// Catalog reads are cached under one tag. Code that writes products or stock
// should call `updateTag("catalog")` (server action) or
// `revalidateTag("catalog", "max")`. Never trust cached stock at checkout.
const CATALOG_TAG = "catalog";

const productWith = {
  category: { columns: { name: true } },
  images: { orderBy: asc(productImages.position) },
  stock: { columns: { quantity: true } },
} as const;

type Tables = ExtractTablesWithRelations<typeof schema>;
type ProductRow = BuildQueryResult<Tables, Tables["products"], { with: typeof productWith }>;

function toProduct(row: ProductRow): Product {
  return {
    slug: row.slug,
    name: row.name,
    category: row.category.name,
    price: row.priceCents / 100,
    color: row.color,
    description: row.description,
    details: row.details,
    stock: row.stock?.quantity ?? 0,
    sizes: row.sizeSystem ? { system: row.sizeSystem, values: row.sizes } : undefined,
    images: row.images.map((image) => ({ src: image.url, alt: image.alt })),
    badge: row.badge ?? undefined,
  };
}

/** Every product, in display order. */
export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const rows = await db.query.products.findMany({
    with: productWith,
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
  return rows.map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const row = await db.query.products.findFirst({
    with: productWith,
    where: (products, { eq }) => eq(products.slug, slug),
  });
  return row && toProduct(row);
}

export async function getProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const rows = await db.select({ slug: products.slug }).from(products);
  return rows.map((row) => row.slug);
}

/** Same-category products first, then the rest, excluding `product` itself. */
export async function getRelatedProducts(product: Product, count = 4) {
  const others = (await getProducts()).filter((p) => p.slug !== product.slug);
  return [
    ...others.filter((p) => p.category === product.category),
    ...others.filter((p) => p.category !== product.category),
  ].slice(0, count);
}

/** Categories with an image, for the home page tiles. */
export async function getHomeCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const rows = await db
    .select()
    .from(categories)
    .where(isNotNull(categories.imageUrl))
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    image: row.imageUrl!,
    alt: row.imageAlt ?? "",
  }));
}
