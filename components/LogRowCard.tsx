// One entry from a weekly/daily log table, stacked for phone width instead of a table row —
// used below sm: wherever a log table has too many columns to fit without horizontal scroll.
export function LogRowCard({
  title,
  stats,
  onEdit,
  cols = 2,
}: {
  title: string;
  stats: { label: string; value: string }[];
  onEdit: () => void;
  cols?: 2 | 3;
}) {
  return (
    <div className="px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{title}</span>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-black/50 underline underline-offset-2 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
        >
          Edit
        </button>
      </div>
      <dl className={`grid gap-x-3 gap-y-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-[11px] uppercase tracking-wide text-black/40 dark:text-white/40">{s.label}</dt>
            <dd className="text-sm font-semibold">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
