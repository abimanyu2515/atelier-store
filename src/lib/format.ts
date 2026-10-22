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
