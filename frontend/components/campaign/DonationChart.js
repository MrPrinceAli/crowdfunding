import { formatDateTime, formatEth, formatNumber, formatShortDate } from "../../lib/format";
import { cumulativeSeries } from "../../lib/stats";
import AreaChart from "../charts/AreaChart";
import ChartFrame, { ChartTable } from "../charts/ChartFrame";
import { useI18n } from "../providers/PreferencesProvider";
import Loader from "../ui/Loader";

/** Grafik dana terkumpul (kumulatif) dari waktu ke waktu, dengan garis target */
const DonationChart = ({ campaign, donations }) => {
  const { t } = useI18n();

  if (!donations) {
    return (
      <ChartFrame title={t("chart.donationTitle")}>
        <Loader />
      </ChartFrame>
    );
  }

  if (donations.length === 0) {
    return (
      <ChartFrame title={t("chart.donationTitle")}>
        <p className="text-muted text-sm">{t("chart.noDonations")}</p>
      </ChartFrame>
    );
  }

  // Titik awal 0 sedikit sebelum donasi pertama agar kenaikan pertama terlihat
  const points = cumulativeSeries(donations, donations[0].time - 3600);
  const table = (
    <ChartTable
      columns={[t("chart.columnTime"), t("chart.columnDonation"), t("chart.columnTotal")]}
      rows={donations.map((donation, index) => [
        formatDateTime(donation.time),
        formatEth(donation.amount),
        formatEth(points[index + 1]?.total ?? donation.amount),
      ])}
    />
  );

  return (
    <ChartFrame
      title={t("chart.donationTitle")}
      summary={t("chart.donationSummary", {
        count: donations.length,
        total: formatEth(campaign.raisedAmount),
        percent: campaign.progress,
      })}
      table={table}
    >
      <AreaChart
        points={points}
        target={campaign.goalAmount}
        targetLabel={t("chart.target", { amount: formatEth(campaign.goalAmount) })}
        ariaLabel={t("chart.donationAria", { total: formatEth(campaign.raisedAmount) })}
        formatValue={(value, full) => (full ? formatEth(value) : formatNumber(value, { maximumFractionDigits: 2 }))}
        formatTime={(time) => formatShortDate(time)}
        formatTooltipTime={(time) => formatDateTime(time)}
      />
    </ChartFrame>
  );
};

export default DonationChart;
