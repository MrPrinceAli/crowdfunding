import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import CampaignCard from "../components/campaign/CampaignCard";
import { useI18n } from "../components/providers/PreferencesProvider";
import EmptyState from "../components/ui/EmptyState";
import IdrValue from "../components/ui/IdrValue";
import { HandsIcon, SparklesIcon } from "../components/ui/Icons";
import Loader from "../components/ui/Loader";
import StatGrid from "../components/ui/StatGrid";
import PendingVotes from "../components/withdraw/PendingVotes";
import { useBlockRefresh } from "../hooks/useBlockRefresh";
import { useWallet } from "../hooks/useWallet";
import { coverGradient } from "../lib/campaign";
import { loadMyContributions, loadPendingVotes } from "../lib/contracts";
import { formatEth, sameAddress, shortAddress } from "../lib/format";
import { selectCampaigns } from "../store/campaigns";

const TABS = ["history", "mine"];

const DonationHistory = ({ contributions, campaigns }) => {
  const { t } = useI18n();
  if (!contributions) return <Loader />;

  if (contributions.length === 0) {
    return (
      <EmptyState
        icon={<HandsIcon />}
        title={t("contributions.emptyTitle")}
        description={t("contributions.emptyText")}
        action={
          <Link href="/dashboard" className="btn-primary">
            {t("contributions.explore")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="card divide-y divide-slate-100 dark:divide-slate-800">
      {[...contributions].reverse().map((contribution, index) => {
        const campaign = campaigns?.find((item) => item.address === contribution.campaignAddress);
        return (
          <Link
            key={index}
            href={`/project-details/${contribution.campaignAddress}`}
            className="surface-hover flex items-center gap-4 p-4 sm:p-5"
          >
            <span
              className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${coverGradient(contribution.campaignAddress)}`}
            />
            <div className="min-w-0 flex-1">
              <p className="text-strong truncate font-bold">{campaign?.title ?? t("contributions.campaign")}</p>
              <p className="text-muted truncate font-mono text-xs">{shortAddress(contribution.campaignAddress)}</p>
              {contribution.message && (
                <p className="text-body mt-1 truncate text-sm italic">“{contribution.message}”</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-accent font-bold">+{formatEth(contribution.amount)}</p>
              <IdrValue eth={contribution.amount} />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

const MyCampaigns = ({ campaigns }) => {
  const { t } = useI18n();
  if (!campaigns) return <Loader />;

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<SparklesIcon />}
        title={t("contributions.noCampaignsTitle")}
        description={t("contributions.noCampaignsText")}
        action={
          <Link href="/dashboard" className="btn-primary">
            {t("dashboard.create")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...campaigns].reverse().map((campaign) => (
        <CampaignCard key={campaign.address} campaign={campaign} />
      ))}
    </div>
  );
};

const MyContributions = () => {
  const { t } = useI18n();
  const wallet = useWallet();
  const { account } = wallet;
  const campaigns = useSelector(selectCampaigns);
  const [tab, setTab] = useState("history");
  const [contributions, setContributions] = useState(null);
  const [pendingVotes, setPendingVotes] = useState(null);

  const myCampaigns = useMemo(
    () => campaigns?.filter((campaign) => sameAddress(campaign.creator, account)),
    [campaigns, account],
  );

  const reloadContributions = useCallback(() => {
    if (!account) return;
    loadMyContributions(account)
      .then(setContributions)
      .catch((error) => {
        console.error(error);
        setContributions((current) => current || []);
      });
  }, [account]);

  useEffect(reloadContributions, [reloadContributions]);
  useBlockRefresh(reloadContributions);

  // Permintaan penarikan dana yang menunggu suara dari akun ini
  useEffect(() => {
    if (!account || !contributions) return;
    const campaignAddresses = [...new Set(contributions.map((item) => item.campaignAddress))];
    loadPendingVotes(account, campaignAddresses)
      .then(setPendingVotes)
      .catch((error) => {
        console.error(error);
        setPendingVotes([]);
      });
  }, [account, contributions]);

  const totalDonated = contributions?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const stats = [
    { label: t("contributions.statDonations"), value: contributions?.length ?? 0 },
    { label: t("contributions.statCampaigns"), value: myCampaigns?.length ?? 0 },
    { label: t("contributions.statTotal"), value: formatEth(totalDonated), eth: totalDonated },
  ];

  return (
    <>
      <Head>
        <title>{t("contributions.pageTitle")}</title>
      </Head>

      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className={`h-14 w-14 flex-shrink-0 rounded-2xl bg-gradient-to-br ${coverGradient(account || "")}`} />
            <div className="min-w-0">
              <h1 className="text-strong text-3xl font-extrabold tracking-tight">{t("contributions.title")}</h1>
              <p className="text-muted mt-1 truncate font-mono text-sm">{account || t("wallet.notConnected")}</p>
            </div>
          </div>
          <StatGrid stats={stats} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!account ? (
          <EmptyState
            icon={<HandsIcon />}
            title={t("wallet.notConnected")}
            description={t("contributions.connectText")}
            action={
              <button
                className="btn-primary"
                onClick={wallet.connect}
                disabled={wallet.isConnecting || !wallet.isReady}
              >
                {wallet.isConnecting ? t("wallet.connecting") : t("wallet.connect")}
              </button>
            }
          />
        ) : (
          <>
            <PendingVotes requests={pendingVotes} />

            <div className="tab-list">
              {TABS.map((key) => (
                <button key={key} className={`tab ${tab === key ? "tab-active" : ""}`} onClick={() => setTab(key)}>
                  {t(`contributions.tab.${key}`)}
                </button>
              ))}
            </div>

            <div className="mt-8">
              {tab === "history" ? (
                <DonationHistory contributions={contributions} campaigns={campaigns} />
              ) : (
                <MyCampaigns campaigns={myCampaigns} />
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
};

export default MyContributions;
