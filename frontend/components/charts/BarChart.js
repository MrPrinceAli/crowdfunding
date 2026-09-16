import { useMemo, useState } from "react";
import { niceTicks } from "../../lib/stats";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 28, left: 52 };
const MAX_BAR = 24;
const GAP = 2;

/**
 * Grafik batang satu seri (mis. donasi per hari). Batang tumbuh dari garis dasar,
 * ujung atas membulat 4px, maksimal 24px, tooltip per batang.
 * bars: [{ key, label, value, detail }]
 */
const BarChart = ({ bars, formatValue, ariaLabel, labelEvery = 1 }) => {
  const [containerRef, width] = useElementWidth();
  const [hovered, setHovered] = useState(null);

  const chart = useMemo(() => {
    const innerWidth = width - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const ticks = niceTicks(Math.max(...bars.map((bar) => bar.value), 0));
    const top = ticks[ticks.length - 1] || 1;
    const slot = innerWidth / Math.max(bars.length, 1);
    const barWidth = Math.max(2, Math.min(MAX_BAR, slot - GAP));
    const y = (value) => PADDING.top + innerHeight - (value / top) * innerHeight;
    return { slot, barWidth, y, ticks, baseline: y(0) };
  }, [bars, width]);

  const barPath = (x, topY, barWidth, baseline) => {
    const height = baseline - topY;
    if (height <= 0) return "";
    const r = Math.min(4, barWidth / 2, height);
    return `M${x},${baseline}V${topY + r}Q${x},${topY} ${x + r},${topY}H${x + barWidth - r}Q${x + barWidth},${topY} ${
      x + barWidth
    },${topY + r}V${baseline}Z`;
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <svg width={width} height={HEIGHT} role="img" aria-label={ariaLabel} className="block select-none">
        {chart.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={chart.y(tick)}
              y2={chart.y(tick)}
              stroke="var(--chart-grid)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={chart.y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-slate-400 text-[11px] tabular-nums dark:fill-slate-500"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {bars.map((bar, index) => {
          const slotX = PADDING.left + index * chart.slot;
          const x = slotX + (chart.slot - chart.barWidth) / 2;
          const isHovered = hovered === index;
          return (
            <g key={bar.key}>
              <path
                d={barPath(x, chart.y(bar.value), chart.barWidth, chart.baseline)}
                fill="var(--chart-series)"
                fillOpacity={hovered === null || isHovered ? 1 : 0.55}
              />
              {index % labelEvery === 0 && (
                <text
                  x={slotX + chart.slot / 2}
                  y={HEIGHT - 8}
                  textAnchor="middle"
                  className="fill-slate-400 text-[11px] dark:fill-slate-500"
                >
                  {bar.label}
                </text>
              )}
              {/* Area hover lebih besar dari batangnya */}
              <rect
                x={slotX}
                y={PADDING.top}
                width={chart.slot}
                height={chart.baseline - PADDING.top}
                fill="transparent"
                tabIndex={0}
                aria-label={`${bar.label}: ${formatValue(bar.value, true)}`}
                onPointerEnter={() => setHovered(index)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
              />
            </g>
          );
        })}
      </svg>

      {hovered !== null && (
        <div
          className="card pointer-events-none absolute top-2 z-10 px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(PADDING.left + hovered * chart.slot + chart.slot / 2 - 70, 0), width - 150),
          }}
        >
          <p className="text-strong text-sm font-bold tabular-nums">{formatValue(bars[hovered].value, true)}</p>
          <p className="text-muted">{bars[hovered].label}</p>
          {bars[hovered].detail && <p className="text-muted">{bars[hovered].detail}</p>}
        </div>
      )}
    </div>
  );
};

export default BarChart;
