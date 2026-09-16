import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useI18n } from "../components/providers/PreferencesProvider";
import EmptyState from "../components/ui/EmptyState";
import AppealPanel from "../components/campaign/AppealPanel";
import CancelForm from "../components/campaign/CancelForm";
import { BanIcon, FlagIcon, ShieldIcon } from "../components/ui/Icons";
import Modal from "../components/ui/Modal";
import Loader from "../components/ui/Loader";
import StatGrid from "../components/ui/StatGrid";
import VerifiedBadge from "../components/ui/VerifiedBadge";
import { useBlockRefresh } from "../hooks/useBlockRefresh";
import { useTransaction } from "../hooks/useTransaction";
import { useWallet } from "../hooks/useWallet";
import { campaignStatus } from "../lib/campaign";
import { loadReports, setCampaignVerified } from "../lib/contracts";
import { formatDate, formatEth, shortAddress } from "../lib/format";
import AddressName from "../components/ui/AddressName";
import { useIdentity } from "../components/providers/IdentityProvider";
import { refreshCampaign, selectCampaigns } from "../store/campaigns";
import { store } from "../store";

const TABS = ["reported", "queue", "verified", "appeals", "takenDown"];

const CampaignRow = ({ campaign, reports }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const { label } = useIdentity([campaign.creator]);
  const [takedownOpen, setTakedownOpen] = useState(false);
  const status = campaignStatus(campaign);

  const toggleVerified = async () => {
    const success = await run(
      "verify",
      (signer) => setCampaignVerified(signer, campaign.address, !campaign.isVerified),
      campaign.isVerified ? t("moderation.unverifiedDone") : t("moderation.verifiedDone"),
    );
    if (success) store.dispatch(refreshCampaign(campaign.address));
  };

  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={status.className}>{t(`status.${status.key}`)}</span>
          {campaign.isVerified && <VerifiedBadge />}
          {campaign.reportCount > 0 && (
            <span className="badge-rose">⚠ {t("moderation.reportedTimes", { count: campaign.reportCount })}</span>
          )}
        </div>
        <Link
          href={`/project-details/${campaign.address}`}
          className="text-strong mt-2 block font-bold hover:underline"
        >
          {campaign.title}
        </Link>
        <p className="text-muted mt-1 text-xs">
          {t("campaign.by", { address: label(campaign.creator) })} · {t(`category.${campaign.category}`)} ·{" "}
          {formatEth(campaign.raisedAmount)} / {formatEth(campaign.goalAmount)} ({campaign.progress}%)
        </p>
        {campaign.cancelledByAdmin && campaign.appealStatus !== "None" && (
          <div className="notice-amber mt-3 px-3 pb-3">
            <AppealPanel campaign={campaign} onChanged={() => store.dispatch(refreshCampaign(campaign.address))} />
          </div>
        )}
        {reports?.length > 0 && (
          <ul className="notice-rose mt-3 space-y-1.5 p-3 text-xs">
            {reports.map((report) => (
              <li key={report.reporter}>
                <AddressName address={report.reporter} className="font-semibold" /> · {formatDate(report.reportedAt)} —{" "}
                {report.reason}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!campaign.isCancelled && (
        <div className="flex flex-col gap-2 sm:w-48">
          <button
            className={campaign.isVerified ? "btn-secondary" : "btn-primary"}
            onClick={toggleVerified}
            disabled={isBusy}
          >
            {isBusy ? t("tx.processing") : campaign.isVerified ? t("moderation.unverify") : t("admin.verify")}
          </button>
          <button className="btn-danger" onClick={() => setTakedownOpen(true)}>
            <BanIcon className="h-4 w-4" />
            {t("takedown.button")}
          </button>
        </div>
      )}
      <Modal open={takedownOpen} onClose={() => setTakedownOpen(false)} title={t("takedown.title")}>
        <CancelForm
          campaign={campaign}
          mode="admin"
          onDone={() => {
            setTakedownOpen(false);
            store.dispatch(refreshCampaign(campaign.address));
          }}
        />
      </Modal>
    </li>
  );
};

/** Halaman admin: kampanye yang dilaporkan & antrean verifikasi */
const AdminPage = () => {
  const { t } = useI18n();
  const wallet = useWallet();
  const campaigns = useSelector(selectCampaigns);
  const [tab, setTab] = useState("reported");
  const [reportsByCampaign, setReportsByCampaign] = useState({});

  const groups = useMemo(() => {
    const list = campaigns || [];
    return {
      reported: list.filter((campaign) => campaign.reportCount > 0).sort((a, b) => b.reportCount - a.reportCount),
      // Kampanye aktif dulu, lalu yang dananya paling banyak
      queue: list
        .filter((campaign) => !campaign.isVerified && !campaign.isCancelled)
        .sort(
          (a, b) =>
            (campaignStatus(a).key === "active" ? 0 : 1) - (campaignStatus(b).key === "active" ? 0 : 1) ||
            b.raisedAmount - a.raisedAmount,
        ),
      verified: list.filter((campaign) => campaign.isVerified),
      takenDown: list.filter((campaign) => campaign.isTakenDown),
      appeals: list.filter((campaign) => campaign.appealStatus === "Pending"),
    };
  }, [campaigns]);

  const reportedKey = groups.reported.map((campaign) => `${campaign.address}:${campaign.reportCount}`).join(",");

  const reloadReports = useCallback(() => {
    if (!reportedKey) return;
    Promise.all(
      reportedKey.split(",").map(async (entry) => {
        const [address] = entry.split(":");
        return [address, await loadReports(address)];
      }),
    )
      .then((entries) => setReportsByCampaign(Object.fromEntries(entries)))
      .catch(console.error);
  }, [reportedKey]);

  useEffect(reloadReports, [reloadReports]);
  useBlockRefresh(reloadReports);

  if (!wallet.isReady || !campaigns) return <Loader />;

  if (!wallet.isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<ShieldIcon />}
          title={t("admin.onlyAdminTitle")}
          description={t("admin.onlyAdminText", { address: shortAddress(wallet.adminAddress) })}
          action={
            <Link href="/dashboard" className="btn-primary">
              {t("detail.backToList")}
            </Link>
          }
        />
      </div>
    );
  }

  const stats = [
    { label: t("admin.statReported"), value: groups.reported.length },
    { label: t("admin.statQueue"), value: groups.queue.length },
    { label: t("admin.statVerified"), value: groups.verified.length },
    { label: t("admin.statAppeals"), value: groups.appeals.length },
    { label: t("admin.statTakenDown"), value: groups.takenDown.length },
  ];
  const items = groups[tab];

  return (
    <>
      <Head>
        <title>{t("admin.pageTitle")}</title>
      </Head>

      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              <ShieldIcon />
            </span>
            <div>
              <h1 className="text-strong text-3xl font-extrabold tracking-tight">{t("admin.title")}</h1>
              <p className="text-body mt-1">{t("admin.subtitle")}</p>
            </div>
          </div>
          <StatGrid stats={stats} className="mt-8 grid-cols-2 lg:grid-cols-5" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="tab-list flex-wrap">
          {TABS.map((key) => (
            <button key={key} className={`tab ${tab === key ? "tab-active" : ""}`} onClick={() => setTab(key)}>
              {t(`admin.tab.${key}`)} ({groups[key].length})
            </button>
          ))}
        </div>

        <div className="mt-6">
          {items.length === 0 ? (
            <EmptyState icon={<FlagIcon />} title={t(`admin.empty.${tab}`)} />
          ) : (
            <ul className="card divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((campaign) => (
                <CampaignRow key={campaign.address} campaign={campaign} reports={reportsByCampaign[campaign.address]} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
};

export default AdminPage;
