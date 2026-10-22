// Cart types and totals. Rows come from src/db/queries/cart.ts, which reads
// prices and stock live; nothing here trusts values sent by the browser.

/** Most units of one line a customer can set in a single request. */
export const CART_QUANTITY_MAX = 99;

export type CartLine = {
  id: number;
  slug: string;
  name: string;
  color: string;
  /** null for products without sizes. */
  size: { system: "EU" | "IT"; value: string } | null;
  image: { src: string; alt: string } | null;
  unitPriceCents: number;
  quantity: number;
  /** Live units of the product, across all sizes. */
  stock: number;
  /** Most this line may be set to: stock minus the bag's other sizes of it. */
  available: number;
};

export type CartSummary = {
  /** `purchasable`: units of the line that stock still covers, claimed in bag order. */
  lines: (CartLine & { purchasable: number })[];
  /** Units across all lines, as stored. */
  itemCount: number;
  /** Price × units that stock can still cover, in cents. */
  subtotalCents: number;
  /** Some line holds more than is in stock, or is sold out. */
  hasStockIssues: boolean;
};

/**
 * Totals a bag. Stock is shared by every size of a product, so lines claim it
 * in bag order and the subtotal counts only units that could still be bought.
 */
export function summarizeCart(lines: CartLine[]): CartSummary {
  const remaining = new Map<string, number>();
  let itemCount = 0;
  let subtotalCents = 0;
  let hasStockIssues = false;

  const summarized = lines.map((line) => {
    const left = remaining.get(line.slug) ?? line.stock;
    const purchasable = Math.max(0, Math.min(line.quantity, left));
    remaining.set(line.slug, left - purchasable);
    itemCount += line.quantity;
    subtotalCents += purchasable * line.unitPriceCents;
    if (purchasable < line.quantity) hasStockIssues = true;
    return { ...line, purchasable };
  });

  return { lines: summarized, itemCount, subtotalCents, hasStockIssues };
}

export function centsToPrice(cents: number) {
  return cents / 100;
}
