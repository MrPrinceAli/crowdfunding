import { useState } from "react";
import { formatEth, formatNumber, formatShortDate, nowInSeconds } from "../../lib/format";
import { dailyTotals } from "../../lib/stats";
import { useI18n } from "../providers/PreferencesProvider";
import Loader from "../ui/Loader";
import BarChart from "./BarChart";
import ChartFrame, { ChartTable } from "./ChartFrame";

const RANGES = [7, 30, 90];

/** Grafik batang donasi per hari dengan pilihan rentang 7/30/90 hari */
const DailyDonationsChart = ({ donations, title }) => {
  const { t } = useI18n();
  const [days, setDays] = useState(30);
  const chartTitle = title || t("creatorStats.chartTitle");

  if (!donations) {
    return (
      <ChartFrame title={chartTitle}>
        <Loader />
      </ChartFrame>
    );
  }

  const buckets = dailyTotals(donations, days, nowInSeconds());
  const inRange = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const bars = buckets.map((bucket) => ({
    key: bucket.day,
    label: formatShortDate(bucket.day),
    value: bucket.total,
    detail: t("creatorStats.donationCount", { count: bucket.count }),
  }));

  return (
    <ChartFrame
      title={chartTitle}
      summary={t("creatorStats.chartSummary", { days, total: formatEth(inRange) })}
      table={
        <ChartTable
          columns={[t("chart.columnDate"), t("chart.columnDonation"), t("creatorStats.columnCount")]}
          rows={[...buckets]
            .reverse()
            .map((bucket) => [formatShortDate(bucket.day, true), formatEth(bucket.total), bucket.count])}
        />
      }
    >
      <div className="mb-4 flex gap-2">
        {RANGES.map((range) => (
          <button key={range} className={`chip ${days === range ? "chip-active" : ""}`} onClick={() => setDays(range)}>
            {t("creatorStats.lastDays", { days: range })}
          </button>
        ))}
      </div>
      {inRange === 0 ? (
        <p className="text-muted py-10 text-center text-sm">{t("creatorStats.noDonationsInRange")}</p>
      ) : (
        <BarChart
          bars={bars}
          ariaLabel={t("creatorStats.chartAria", { days, total: formatEth(inRange) })}
          formatValue={(value, full) => (full ? formatEth(value) : formatNumber(value, { maximumFractionDigits: 2 }))}
          labelEvery={days <= 7 ? 1 : days <= 30 ? 5 : 15}
        />
      )}
    </ChartFrame>
  );
};

export default DailyDonationsChart;
