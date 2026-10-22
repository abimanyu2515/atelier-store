import {
  and,
  asc,
  desc,
  ilike,
  inArray,
  isNotNull,
  or,
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
  category: { columns: { name: true, slug: true } },
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
    categorySlug: row.category.slug,
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

/** Most recently added products; same-day drops keep their display order. */
export async function getNewArrivals(count = 12): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const rows = await db.query.products.findMany({
    with: productWith,
    orderBy: [desc(products.createdAt), asc(products.sortOrder), asc(products.id)],
    limit: count,
  });
  return rows.map(toProduct);
}

/** Longest query and most words `searchProducts` will consider. */
export const SEARCH_MAX_LENGTH = 100;
const SEARCH_MAX_TERMS = 8;

/**
 * Products where every word of `query` appears in the name, color, category
 * or description, in display order. Callers pass a normalized query (see
 * `normalizeSearchQuery`) so equivalent searches share a cache entry.
 */
export async function searchProducts(query: string): Promise<Product[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const terms = query.split(" ").filter(Boolean).slice(0, SEARCH_MAX_TERMS);
  if (terms.length === 0) return [];

  const rows = await db.query.products.findMany({
    with: productWith,
    where: and(
      ...terms.map((term) => {
        // Match the term literally: escape LIKE wildcards and the escape char.
        const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
        return or(
          ilike(products.name, pattern),
          ilike(products.color, pattern),
          ilike(products.description, pattern),
          inArray(
            products.categoryId,
            db
              .select({ id: categories.id })
              .from(categories)
              .where(ilike(categories.name, pattern)),
          ),
        );
      }),
    ),
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
  return rows.map(toProduct);
}

/** Trims, collapses whitespace, lowercases and caps the length of a query. */
export function normalizeSearchQuery(query: string | string[] | undefined) {
  const value = Array.isArray(query) ? query[0] : query;
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, SEARCH_MAX_LENGTH);
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

export async function getCategorySlugs(): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const rows = await db.select({ slug: categories.slug }).from(categories);
  return rows.map((row) => row.slug);
}

/** A category's name and its products in display order. */
export async function getCategoryWithProducts(
  slug: string,
): Promise<{ name: string; products: Product[] } | undefined> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const category = await db.query.categories.findFirst({
    columns: { id: true, name: true },
    where: (categories, { eq }) => eq(categories.slug, slug),
  });
  if (!category) return undefined;

  const rows = await db.query.products.findMany({
    with: productWith,
    where: (products, { eq }) => eq(products.categoryId, category.id),
    orderBy: [asc(products.sortOrder), asc(products.id)],
  });
  return { name: category.name, products: rows.map(toProduct) };
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
