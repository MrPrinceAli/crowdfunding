/**
 * Batang horizontal berperingkat untuk perbandingan antar kategori (satu seri).
 * Label & nilai ditulis langsung di samping batang, jadi tidak perlu tooltip atau legenda.
 * items: [{ key, label, value, detail }]
 */
const RankedBars = ({ items, formatValue, ariaLabel }) => {
  const max = Math.max(...items.map((item) => item.value), 0);

  return (
    <ul className="space-y-3" aria-label={ariaLabel}>
      {items.map((item) => {
        const percent = max > 0 ? (item.value / max) * 100 : 0;
        return (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-body truncate font-medium">{item.label}</span>
              <span className="text-strong flex-shrink-0 font-semibold tabular-nums">
                {formatValue(item.value)}
                {item.detail && <span className="text-muted ml-1.5 text-xs font-normal">· {item.detail}</span>}
              </span>
            </div>
            <div className="mt-1.5 h-3 w-full">
              {item.value > 0 && (
                <div
                  className="h-full min-w-[4px] rounded-r"
                  style={{ width: `${percent}%`, background: "var(--chart-series)" }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default RankedBars;
