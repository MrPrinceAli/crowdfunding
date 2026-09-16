import { useMemo, useState } from "react";
import { niceTicks } from "../../lib/stats";
import { useElementWidth } from "./useElementWidth";

const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 52 };

/**
 * Grafik area satu seri (dana terkumpul dari waktu ke waktu) sebagai step chart,
 * dengan garis target, crosshair, dan tooltip.
 * points: [{ time, total }] terurut waktu · formatValue / formatTime: fungsi label
 */
const AreaChart = ({ points, target, formatValue, formatTime, formatTooltipTime, ariaLabel, targetLabel }) => {
  const [containerRef, width] = useElementWidth();
  const [hoverIndex, setHoverIndex] = useState(null);

  const chart = useMemo(() => {
    const innerWidth = width - PADDING.left - PADDING.right;
    const innerHeight = HEIGHT - PADDING.top - PADDING.bottom;
    const startTime = points[0]?.time ?? 0;
    const endTime = Math.max(points[points.length - 1]?.time ?? 1, startTime + 1);
    const maxValue = Math.max(...points.map((point) => point.total), target || 0);
    const ticks = niceTicks(maxValue);
    const top = ticks[ticks.length - 1] || 1;

    const x = (time) => PADDING.left + ((time - startTime) / (endTime - startTime)) * innerWidth;
    const y = (value) => PADDING.top + innerHeight - (value / top) * innerHeight;

    // Step: nilai tetap sampai donasi berikutnya masuk
    let line = "";
    points.forEach((point, index) => {
      if (index === 0) line = `M${x(point.time)},${y(point.total)}`;
      else line += `H${x(point.time)}V${y(point.total)}`;
    });
    const lastX = x(points[points.length - 1]?.time ?? startTime);
    const area = points.length ? `${line}V${y(0)}H${x(points[0].time)}Z` : "";

    const timeTicks = [startTime, startTime + (endTime - startTime) / 2, endTime];
    return { innerWidth, x, y, ticks, line, area, lastX, timeTicks };
  }, [points, target, width]);

  const onPointerMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    let nearest = 0;
    points.forEach((point, index) => {
      if (Math.abs(chart.x(point.time) - pointerX) < Math.abs(chart.x(points[nearest].time) - pointerX))
        nearest = index;
    });
    setHoverIndex(nearest);
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const last = points[points.length - 1];

  return (
    <div ref={containerRef} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={ariaLabel}
        className="block touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
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

        {chart.timeTicks.map((time, index) => (
          <text
            key={index}
            x={chart.x(time)}
            y={HEIGHT - 8}
            textAnchor={index === 0 ? "start" : index === 2 ? "end" : "middle"}
            className="fill-slate-400 text-[11px] dark:fill-slate-500"
          >
            {formatTime(time)}
          </text>
        ))}

        {target > 0 && (
          <g>
            <line
              x1={PADDING.left}
              x2={width - PADDING.right}
              y1={chart.y(target)}
              y2={chart.y(target)}
              className="stroke-slate-400 dark:stroke-slate-500"
              strokeWidth="1"
            />
            <text
              x={width - PADDING.right}
              y={chart.y(target) - 6}
              textAnchor="end"
              className="fill-slate-500 text-[11px] font-medium dark:fill-slate-400"
            >
              {targetLabel}
            </text>
          </g>
        )}

        {points.length > 0 && (
          <>
            <path d={chart.area} fill="var(--chart-series)" fillOpacity="0.1" />
            <path
              d={chart.line}
              fill="none"
              stroke="var(--chart-series)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={chart.lastX}
              cy={chart.y(last.total)}
              r="4"
              fill="var(--chart-series)"
              stroke="var(--chart-surface)"
              strokeWidth="2"
            />
          </>
        )}

        {hovered && (
          <g pointerEvents="none">
            <line
              x1={chart.x(hovered.time)}
              x2={chart.x(hovered.time)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeWidth="1"
            />
            <circle
              cx={chart.x(hovered.time)}
              cy={chart.y(hovered.total)}
              r="5"
              fill="var(--chart-series)"
              stroke="var(--chart-surface)"
              strokeWidth="2"
            />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="card pointer-events-none absolute top-2 z-10 px-3 py-2 text-xs shadow-lg"
          style={{
            left: Math.min(Math.max(chart.x(hovered.time) + 12, 0), width - 170),
          }}
        >
          <p className="text-strong text-sm font-bold tabular-nums">{formatValue(hovered.total, true)}</p>
          <p className="text-muted">{formatTooltipTime(hovered.time)}</p>
        </div>
      )}
    </div>
  );
};

export default AreaChart;
