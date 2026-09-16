import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import ContributorList from "../components/campaign/ContributorList";
import ChartFrame, { ChartTable } from "../components/charts/ChartFrame";
import DailyDonationsChart from "../components/charts/DailyDonationsChart";
import RankedBars from "../components/charts/RankedBars";
import { useI18n } from "../components/providers/PreferencesProvider";
import { ChartIcon } from "../components/ui/Icons";
import Loader from "../components/ui/Loader";
import StatGrid from "../components/ui/StatGrid";
import { useBlockRefresh } from "../hooks/useBlockRefresh";
import { loadDonationsForCampaigns } from "../lib/contracts";
import { formatEth, formatNumber } from "../lib/format";
import { platformSummary } from "../lib/stats";
import { selectCampaigns } from "../store/campaigns";
import { reportError } from "../lib/log";

const TOP_CAMPAIGNS = 5;

const StatsPage = () => {
  const { t } = useI18n();
  const campaigns = useSelector(selectCampaigns);
  const [donations, setDonations] = useState(null);

  const addressKey = (campaigns || []).map((campaign) => campaign.address).join(",");
  const reloadDonations = useCallback(() => {
    if (!campaigns) return;
    loadDonationsForCampaigns(addressKey ? addressKey.split(",") : [])
      .then(setDonations)
      .catch((error) => {
        reportError("Memuat donasi untuk statistik", error);
        setDonations((current) => current || []);
      });
  }, [campaigns, addressKey]);

  useEffect(reloadDonations, [reloadDonations]);
  useBlockRefresh(reloadDonations, 5000);

  const summary = useMemo(() => campaigns && platformSummary(campaigns, donations), [campaigns, donations]);

  if (!campaigns) return <Loader />;

  const stats = [
    {
      label: t("stats.campaigns"),
      value: formatNumber(campaigns.length),
      hint: t("stats.activeHint", { count: summary.activeCount }),
    },
    { label: t("stats.raised"), value: formatEth(summary.totalRaised), eth: summary.totalRaised },
    { label: t("stats.withdrawn"), value: formatEth(summary.totalWithdrawn), eth: summary.totalWithdrawn },
    {
      label: t("stats.donors"),
      value: summary.donors ? formatNumber(summary.donors.length) : "–",
      hint: donations ? t("creatorStats.donationCount", { count: donations.length }) : undefined,
    },
    {
      label: t("stats.successRate"),
      value: `${summary.successRate}%`,
      hint: t("stats.successHint", { count: summary.successfulCount }),
    },
  ];

  const topCampaigns = [...campaigns]
    .filter((campaign) => !campaign.isTakenDown)
    .sort((a, b) => b.raisedAmount - a.raisedAmount)
    .slice(0, TOP_CAMPAIGNS);

  return (
    <>
      <Head>
        <title>{t("stats.pageTitle")}</title>
      </Head>

      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <ChartIcon />
            </span>
            <div>
              <h1 className="text-strong text-3xl font-extrabold tracking-tight">{t("stats.title")}</h1>
              <p className="text-body mt-1">{t("stats.subtitle")}</p>
            </div>
          </div>
          <StatGrid stats={stats} className="mt-8 grid-cols-2 lg:grid-cols-5" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="min-w-0 space-y-8 lg:col-span-2">
          <DailyDonationsChart donations={donations} title={t("stats.dailyTitle")} />

          <ChartFrame
            title={t("stats.categoryTitle")}
            summary={t("stats.categorySummary")}
            table={
              <ChartTable
                columns={[t("form.category"), t("stats.raised"), t("stats.campaigns")]}
                rows={summary.byCategory.map((item) => [
                  t(`category.${item.category}`),
                  formatEth(item.raised),
                  item.count,
                ])}
              />
            }
          >
            <RankedBars
              ariaLabel={t("stats.categoryTitle")}
              formatValue={formatEth}
              items={summary.byCategory.map((item) => ({
                key: item.category,
                label: t(`category.${item.category}`),
                value: item.raised,
                detail: t("stats.campaignCount", { count: item.count }),
              }))}
            />
          </ChartFrame>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-strong font-bold">{t("stats.topCampaigns")}</h2>
            {topCampaigns.length === 0 ? (
              <p className="text-muted mt-3 text-sm">{t("dashboard.empty.none.title")}</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {topCampaigns.map((campaign, index) => (
                  <li key={campaign.address}>
                    <Link
                      href={`/project-details/${campaign.address}`}
                      className="surface-hover -mx-2 flex items-center gap-3 rounded-xl p-2"
                    >
                      <span className="text-faint w-5 text-center text-xs font-semibold">{index + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="text-strong block truncate text-sm font-semibold">{campaign.title}</span>
                        <span className="text-muted block text-xs">
                          {t("campaign.progress", { percent: campaign.progress })}
                        </span>
                      </span>
                      <span className="text-strong text-sm font-bold tabular-nums">
                        {formatEth(campaign.raisedAmount)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <ContributorList contributors={summary.donors} title={t("stats.topDonors")} />
        </aside>
      </section>
    </>
  );
};

export default StatsPage;
