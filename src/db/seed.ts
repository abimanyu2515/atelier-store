// Loads the sample catalog into the database. Safe to re-run: rows are
// upserted by slug, and each product's images are replaced.
//
//   npm run db:seed

import { loadEnvConfig } from "@next/env";
import { inArray, sql } from "drizzle-orm";
import { categories, productImages, products, productStock } from "./schema";
import * as seed from "./seed-data";

async function main() {
  // `./index` throws at import time without DATABASE_URL, so load env first.
  loadEnvConfig(process.cwd());
  const { db } = await import("./index");

  const categoryRows = await db
    .insert(categories)
    .values(
      seed.categories.map((category, i) => ({
        slug: category.slug,
        name: category.name,
        imageUrl: category.image ?? null,
        imageAlt: category.alt ?? null,
        sortOrder: i,
      })),
    )
    .onConflictDoUpdate({
      target: categories.slug,
      set: {
        name: sql`excluded.name`,
        imageUrl: sql`excluded.image_url`,
        imageAlt: sql`excluded.image_alt`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: categories.id, name: categories.name });

  const categoryIds = new Map(categoryRows.map((row) => [row.name, row.id]));

  const productRows = await db
    .insert(products)
    .values(
      seed.products.map((product, i) => {
        const categoryId = categoryIds.get(product.category);
        if (categoryId === undefined) {
          throw new Error(`Unknown category "${product.category}" for ${product.slug}`);
        }
        return {
          categoryId,
          slug: product.slug,
          name: product.name,
          description: product.description,
          color: product.color,
          priceCents: Math.round(product.price * 100),
          badge: product.badge ?? null,
          details: product.details,
          sizeSystem: product.sizes?.system ?? null,
          sizes: [...(product.sizes?.values ?? [])],
          sortOrder: i,
        };
      }),
    )
    .onConflictDoUpdate({
      target: products.slug,
      set: {
        categoryId: sql`excluded.category_id`,
        name: sql`excluded.name`,
        description: sql`excluded.description`,
        color: sql`excluded.color`,
        priceCents: sql`excluded.price_cents`,
        badge: sql`excluded.badge`,
        details: sql`excluded.details`,
        sizeSystem: sql`excluded.size_system`,
        sizes: sql`excluded.sizes`,
        sortOrder: sql`excluded.sort_order`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ id: products.id, slug: products.slug });

  const productIds = new Map(productRows.map((row) => [row.slug, row.id]));
  const ids = [...productIds.values()];
  const idFor = (slug: string) => productIds.get(slug)!;

  // neon-http runs a batch as a single transaction.
  await db.batch([
    db.delete(productImages).where(inArray(productImages.productId, ids)),
    db.insert(productImages).values(
      seed.products.flatMap((product) =>
        product.images.map((image, position) => ({
          productId: idFor(product.slug),
          url: image.src,
          alt: image.alt,
          position,
        })),
      ),
    ),
    db
      .insert(productStock)
      .values(
        seed.products.map((product) => ({
          productId: idFor(product.slug),
          quantity: product.stock,
        })),
      )
      .onConflictDoUpdate({
        target: productStock.productId,
        set: { quantity: sql`excluded.quantity`, updatedAt: sql`now()` },
      }),
  ]);

  console.log(
    `Seeded ${categoryRows.length} categories and ${productRows.length} products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
