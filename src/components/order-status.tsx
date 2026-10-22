import type { Order } from "@/db/queries/orders";

const statuses: Record<Order["status"], { label: string; dot: string }> = {
  pending: { label: "Awaiting payment", dot: "bg-muted-foreground" },
  processing: { label: "Payment processing", dot: "bg-accent" },
  paid: { label: "Paid", dot: "bg-success" },
  failed: { label: "Payment failed", dot: "bg-danger" },
  expired: { label: "Not completed", dot: "bg-muted-foreground" },
  refunded: { label: "Refunded", dot: "bg-muted-foreground" },
};

export function orderStatusLabel(status: Order["status"]) {
  return statuses[status].label;
}

/** Payment status as a dot and label, like the stock indicator on product pages. */
export function OrderStatus({ status, className = "" }: { status: Order["status"]; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className={`size-1.5 shrink-0 ${statuses[status].dot}`} aria-hidden="true" />
      {statuses[status].label}
    </span>
  );
}
