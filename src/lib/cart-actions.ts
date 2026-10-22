"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/db";
import {
  getCartLineForUpdate,
  getLineQuantity,
  getProductForCart,
  getUnitsHeldInOtherSizes,
} from "@/db/queries/cart";
import { cartItems } from "@/db/schema";
import { CART_QUANTITY_MAX } from "@/lib/cart";
import { requireUser } from "@/lib/session";

// The browser sends only what the customer chose: a product slug, a size and
// a quantity. Price and stock are always read here, uncached. Stock is shared
// by every size of a product, so a line may hold at most what the product has
// left after the bag's other sizes of it.
//
// neon-http has no transactions. Each action reads, then makes one write. A
// race needs the same customer in two tabs at once, and the cart reserves
// nothing, so checkout must re-check stock atomically when it exists.

export type AddToCartState =
  | { status: "idle" }
  | { status: "added"; message: string }
  | { status: "error"; message: string };

export type CartLineResult = { ok: true; message?: string } | { ok: false; message: string };

const SLUG_PATTERN = /^[a-z0-9-]{1,200}$/;

function parseQuantity(value: unknown, min: number) {
  const quantity = typeof value === "string" ? Number(value) : value;
  return typeof quantity === "number" &&
    Number.isInteger(quantity) &&
    quantity >= min &&
    quantity <= CART_QUANTITY_MAX
    ? quantity
    : null;
}

export async function addToCart(
  _previous: AddToCartState,
  formData: FormData,
): Promise<AddToCartState> {
  const slug = formData.get("slug");
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return { status: "error", message: "This item is unavailable." };
  }
  // Signed-out visitors go to sign-in and come back to the product.
  const user = await requireUser(`/products/${slug}`);

  const requested = parseQuantity(formData.get("quantity") ?? "1", 1);
  if (requested === null) return { status: "error", message: "Choose a valid quantity." };

  const product = await getProductForCart(slug);
  if (!product) return { status: "error", message: "This item is unavailable." };

  const rawSize = formData.get("size");
  const size = typeof rawSize === "string" ? rawSize : "";
  if (product.sizeSystem ? !product.sizes.includes(size) : size !== "") {
    return { status: "error", message: product.sizeSystem ? "Select a size." : "This item is unavailable." };
  }

  const [existing, otherSizes] = await Promise.all([
    getLineQuantity(user.id, product.id, size),
    getUnitsHeldInOtherSizes(user.id, product.id, size),
  ]);
  const allowed = Math.min(product.stock - otherSizes, CART_QUANTITY_MAX);

  if (product.stock <= 0) return { status: "error", message: "This piece is sold out." };
  if (allowed <= existing) {
    return {
      status: "error",
      message: `Only ${product.stock} available, and they're all in your bag.`,
    };
  }

  const quantity = Math.min(existing + requested, allowed);
  await db
    .insert(cartItems)
    .values({ userId: user.id, productId: product.id, size, quantity })
    .onConflictDoUpdate({
      target: [cartItems.userId, cartItems.productId, cartItems.size],
      set: { quantity, updatedAt: sql`now()` },
    });

  refresh();
  return {
    status: "added",
    message:
      quantity < existing + requested
        ? `Only ${product.stock} available. Your bag now holds all of them.`
        : "Added to your bag.",
  };
}

/** Sets a line's quantity, capped at stock. 0 removes the line. */
export async function updateCartItem(lineId: unknown, quantity: unknown): Promise<CartLineResult> {
  const user = await requireUser("/cart");
  const requested = parseQuantity(quantity, 0);
  if (typeof lineId !== "number" || !Number.isInteger(lineId) || requested === null) {
    return { ok: false, message: "Choose a valid quantity." };
  }
  if (requested === 0) return removeCartItem(lineId);

  const line = await getCartLineForUpdate(user.id, lineId);
  if (!line) return { ok: false, message: "This item is no longer in your bag." };

  const otherSizes = await getUnitsHeldInOtherSizes(user.id, line.productId, line.size);
  const allowed = Math.min(line.stock - otherSizes, CART_QUANTITY_MAX);
  if (allowed <= 0) {
    refresh();
    return { ok: false, message: "This piece is sold out." };
  }

  const next = Math.min(requested, allowed);
  await db
    .update(cartItems)
    .set({ quantity: next, updatedAt: sql`now()` })
    .where(and(eq(cartItems.id, line.id), eq(cartItems.userId, user.id)));

  refresh();
  return next < requested
    ? { ok: true, message: `Only ${allowed} available for this item.` }
    : { ok: true };
}

export async function removeCartItem(lineId: unknown): Promise<CartLineResult> {
  const user = await requireUser("/cart");
  if (typeof lineId !== "number" || !Number.isInteger(lineId)) {
    return { ok: false, message: "This item is no longer in your bag." };
  }
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.id, lineId), eq(cartItems.userId, user.id)));
  refresh();
  return { ok: true };
}
