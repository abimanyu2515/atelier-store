type Props = {
  items: { label: string; value: string }[];
};

/** Label/value pairs separated by hairlines, e.g. account information. */
export function DetailList({ items }: Props) {
  return (
    <dl className="divide-y border-y">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 py-4 sm:grid sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6"
        >
          <dt className="type-label text-muted-foreground sm:pt-0.5">{item.label}</dt>
          <dd className="type-body wrap-break-word">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function DetailListSkeleton({ rows }: { rows: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="divide-y border-y">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 py-4">
          <div className="h-3 w-24 bg-surface" />
          <div className="h-5 w-48 max-w-full bg-surface" />
        </div>
      ))}
    </div>
  );
}
