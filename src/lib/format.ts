// UTC so the month never shifts with the server's time zone.
const monthYearFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "October 2026" */
export function formatMemberSince(date: Date) {
  return monthYearFormat.format(date);
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "October 22, 2026" */
export function formatDate(date: Date) {
  return dateFormat.format(date);
}

/** A short, readable reference for an order id: "59019013". */
export function formatOrderNumber(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}
