import { DetailList } from "@/components/detail-list";
import type { Order, OrderItem } from "@/db/queries/orders";
import { centsToPrice } from "@/lib/cart";
import { formatPrice } from "@/lib/catalog";

// What an order contains and where it ships, as frozen at checkout. Shared by
// the checkout confirmation and the account's order details.

export function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <ul className="divide-y border-y" aria-label="Items in this order">
      {items.map((item) => (
        <li key={item.id} className="flex justify-between gap-6 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="type-body">{item.productName}</p>
            <p className="type-caption">
              {item.color}
              {item.size && ` · Size ${item.size} (${item.sizeSystem})`}
              {` · Qty ${item.quantity}`}
            </p>
          </div>
          <p className="type-price shrink-0">
            {formatPrice(centsToPrice(item.unitPriceCents * item.quantity))}
          </p>
        </li>
      ))}
    </ul>
  );
}

type Detail = { label: string; value: string };

/** Total, contact and shipping details; `before` adds rows above them. */
export function OrderDetails({ order, before = [] }: { order: Order; before?: Detail[] }) {
  const address = order.shippingAddress;
  return (
    <DetailList
      items={[
        ...before,
        { label: "Total", value: formatPrice(centsToPrice(order.totalCents)) },
        ...(order.email ? [{ label: "Email", value: order.email }] : []),
        ...(order.shippingName && address
          ? [
              {
                label: "Shipping to",
                value: [
                  order.shippingName,
                  address.line1,
                  address.line2,
                  [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
                  address.country,
                ]
                  .filter(Boolean)
                  .join(", "),
              },
            ]
          : []),
      ]}
    />
  );
}
