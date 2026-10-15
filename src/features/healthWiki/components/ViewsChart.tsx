/** Bars for the last 14 days of views, oldest first. Values are scaled to the largest day. */
export default function ViewsChart({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const last = values[values.length - 1] ?? 0;
  return (
    <div>
      <div role="img" aria-label={`Views per day for the last ${values.length} days, from ${values[0] ?? 0} to ${last}`} className="flex h-24 items-end gap-1">
        {values.map((v, i) => (
          <div
            key={i}
            title={`${v} ${v === 1 ? 'view' : 'views'}`}
            style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            className={i === values.length - 1 ? 'flex-1 rounded-t bg-indigo-600' : 'flex-1 rounded-t bg-indigo-200'}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-500"><span>{values.length} days ago</span><span>Today: {last}</span></div>
    </div>
  );
}
