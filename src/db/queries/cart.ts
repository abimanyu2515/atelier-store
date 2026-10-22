import "server-only";
import { and, asc, eq, ne, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, productImages, products, productStock } from "@/db/schema";
import type { CartLine } from "@/lib/cart";

// Cart reads are uncached on purpose: they depend on the session and must
// show live prices and stock. Never wrap these in 'use cache'.

/** A customer's bag in the order lines were added, with live price and stock. */
export async function getCart(userId: string) {
  const rows = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      size: cartItems.size,
      slug: products.slug,
      name: products.name,
      color: products.color,
      priceCents: products.priceCents,
      sizeSystem: products.sizeSystem,
      stock: productStock.quantity,
      imageUrl: productImages.url,
      imageAlt: productImages.alt,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .leftJoin(
      productImages,
      and(eq(productImages.productId, products.id), eq(productImages.position, 0)),
    )
    .where(eq(cartItems.userId, userId))
    .orderBy(asc(cartItems.createdAt), asc(cartItems.id));

  const heldBySlug = new Map<string, number>();
  for (const row of rows) {
    heldBySlug.set(row.slug, (heldBySlug.get(row.slug) ?? 0) + row.quantity);
  }

  return rows.map((row): CartLine => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    color: row.color,
    size: row.sizeSystem && row.size ? { system: row.sizeSystem, value: row.size } : null,
    image: row.imageUrl ? { src: row.imageUrl, alt: row.imageAlt ?? "" } : null,
    unitPriceCents: row.priceCents,
    quantity: row.quantity,
    stock: row.stock ?? 0,
    available: Math.max(
      0,
      (row.stock ?? 0) - ((heldBySlug.get(row.slug) ?? 0) - row.quantity),
    ),
  }));
}

/** Units in a customer's bag, for the header. */
export async function getCartCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sum(cartItems.quantity).mapWith(Number) })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));
  return row?.count ?? 0;
}

/** A product's live stock and size options, by slug. */
export async function getProductForCart(slug: string) {
  const [row] = await db
    .select({
      id: products.id,
      sizeSystem: products.sizeSystem,
      sizes: products.sizes,
      stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
    })
    .from(products)
    .leftJoin(productStock, eq(productStock.productId, products.id))
    .where(eq(products.slug, slug))
    .limit(1);
  return row;
}

/** One of the customer's lines with its product's live stock, or undefined if not theirs. */
export async function getCartLineForUpdate(userId: string, lineId: number) {
  const [row] = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      size: cartItems.size,
      quantity: cartItems.quantity,
      stock: sql<number>`coalesce(${productStock.quantity}, 0)`.mapWith(Number),
    })
    .from(cartItems)
    .leftJoin(productStock, eq(productStock.productId, cartItems.productId))
    .where(and(eq(cartItems.id, lineId), eq(cartItems.userId, userId)))
    .limit(1);
  return row;
}

/** Units of a product the customer holds in sizes other than `exceptSize`. */
export async function getUnitsHeldInOtherSizes(
  userId: string,
  productId: number,
  exceptSize: string,
): Promise<number> {
  const [row] = await db
    .select({ held: sum(cartItems.quantity).mapWith(Number) })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productId),
        ne(cartItems.size, exceptSize),
      ),
    );
  return row?.held ?? 0;
}

/** The quantity of one line, or 0 if the customer doesn't have it. */
export async function getLineQuantity(userId: string, productId: number, size: string) {
  const [row] = await db
    .select({ quantity: cartItems.quantity })
    .from(cartItems)
    .where(
      and(
        eq(cartItems.userId, userId),
        eq(cartItems.productId, productId),
        eq(cartItems.size, size),
      ),
    )
    .limit(1);
  return row?.quantity ?? 0;
}
