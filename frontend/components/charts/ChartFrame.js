import { useState } from "react";
import { useI18n } from "../providers/PreferencesProvider";

/**
 * Bingkai grafik: judul, ringkasan, grafik, dan tampilan tabel sebagai alternatif
 * (nilai tetap bisa dibaca tanpa hover, mis. dengan pembaca layar).
 */
const ChartFrame = ({ title, summary, children, table }) => {
  const { t } = useI18n();
  const [showTable, setShowTable] = useState(false);

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-strong text-lg font-bold">{title}</h2>
          {summary && <p className="text-muted mt-1 text-sm">{summary}</p>}
        </div>
        {table && (
          <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setShowTable(!showTable)}>
            {showTable ? t("chart.showChart") : t("chart.showTable")}
          </button>
        )}
      </div>
      <div className="mt-5">{showTable ? table : children}</div>
    </div>
  );
};

export const ChartTable = ({ columns, rows }) => (
  <div className="max-h-72 overflow-auto">
    <table className="w-full text-left text-sm">
      <thead className="text-muted sticky top-0 bg-white text-xs uppercase tracking-wide dark:bg-slate-900">
        <tr>
          {columns.map((column) => (
            <th key={column} className="py-2 pr-4 font-semibold">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="text-body divide-y divide-slate-100 tabular-nums dark:divide-slate-800">
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-2 pr-4">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default ChartFrame;
