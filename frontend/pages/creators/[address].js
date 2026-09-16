import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import CampaignCard from "../../components/campaign/CampaignCard";
import DailyDonationsChart from "../../components/charts/DailyDonationsChart";
import DisplayNameForm from "../../components/profile/DisplayNameForm";
import { useIdentity } from "../../components/providers/IdentityProvider";
import { useI18n } from "../../components/providers/PreferencesProvider";
import EmptyState from "../../components/ui/EmptyState";
import { Avatar } from "../../components/ui/AddressName";
import { ArrowLeftIcon, PencilIcon, SparklesIcon } from "../../components/ui/Icons";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import StatGrid from "../../components/ui/StatGrid";
import VerifiedBadge from "../../components/ui/VerifiedBadge";
import { useBlockRefresh } from "../../hooks/useBlockRefresh";
import { campaignStatus } from "../../lib/campaign";
import { loadDonationsForCampaigns } from "../../lib/contracts";
import { formatEth, sameAddress } from "../../lib/format";
import { toastSuccess } from "../../lib/toast";
import { selectCampaigns } from "../../store/campaigns";
import { selectAccount } from "../../store/wallet";

/** Profil & statistik penggalang dana: semua kampanye dari satu alamat dompet */
const CreatorProfile = () => {
  const { t } = useI18n();
  const { address } = useRouter().query;
  const campaigns = useSelector(selectCampaigns);
  const account = useSelector(selectAccount);
  const [donations, setDonations] = useState(null);
  const [nameFormOpen, setNameFormOpen] = useState(false);
  const { identityOf, label } = useIdentity([address]);

  const created = useMemo(
    () => (campaigns || []).filter((campaign) => sameAddress(campaign.creator, address)).reverse(),
    [campaigns, address],
  );
  const createdKey = created.map((campaign) => campaign.address).join(",");

  const reloadDonations = useCallback(() => {
    if (!campaigns) return;
    const addresses = createdKey ? createdKey.split(",") : [];
    loadDonationsForCampaigns(addresses)
      .then(setDonations)
      .catch((error) => {
        console.error(error);
        setDonations((current) => current || []);
      });
  }, [campaigns, createdKey]);

  useEffect(reloadDonations, [reloadDonations]);
  useBlockRefresh(reloadDonations);

  if (!address) return <Loader />;

  const totalRaised = created.reduce((sum, campaign) => sum + campaign.raisedAmount, 0);
  const totalWithdrawn = created.reduce((sum, campaign) => sum + campaign.withdrawnAmount, 0);
  const successCount = created.filter((campaign) => campaignStatus(campaign).key === "successful").length;
  const verifiedCount = created.filter((campaign) => campaign.isVerified).length;
  const reportCount = created.reduce((sum, campaign) => sum + campaign.reportCount, 0);
  const activeVoting = created.reduce((sum, campaign) => sum + campaign.activeVotingCount, 0);
  const uniqueDonors = donations ? new Set(donations.map((donation) => donation.contributor.toLowerCase())).size : null;
  const isMe = sameAddress(address, account);
  const identity = identityOf(address);

  const stats = [
    {
      label: t("creatorStats.campaigns"),
      value: campaigns ? created.length : "–",
      hint: t("creatorStats.successful", { count: successCount }),
    },
    {
      label: t("creatorStats.raised"),
      value: campaigns ? formatEth(totalRaised) : "–",
      eth: campaigns ? totalRaised : null,
    },
    {
      label: t("creatorStats.withdrawn"),
      value: campaigns ? formatEth(totalWithdrawn) : "–",
      eth: campaigns ? totalWithdrawn : null,
    },
    {
      label: t("creatorStats.donors"),
      value: uniqueDonors ?? "–",
      hint: donations ? t("creatorStats.donationCount", { count: donations.length }) : undefined,
    },
  ];

  return (
    <>
      <Head>
        <title>{t("creatorStats.pageTitle", { address: label(address) })}</title>
      </Head>

      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="text-muted inline-flex items-center gap-2 text-sm font-semibold hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("creatorStats.allCampaigns")}
          </Link>

          <div className="mt-6 flex items-center gap-4">
            <Avatar address={address} className="h-16 w-16" />
            <div className="min-w-0">
              <p className="text-accent text-sm font-semibold">
                {t("creatorStats.fundraiser")}
                {isMe && <span className="badge-overlay ml-2">{t("creatorStats.itsYou")}</span>}
              </p>
              {identity.name && (
                <h1 className="text-strong mt-1 flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  <span className="min-w-0 break-words">{identity.name}</span>
                  {identity.ensName && identity.ensName !== identity.name && (
                    <span className="badge-slate font-mono text-xs font-medium">{identity.ensName}</span>
                  )}
                  {!identity.profileName && identity.ensName && <span className="badge-sky text-xs">ENS</span>}
                </h1>
              )}
              <button
                type="button"
                className={`mt-1 block max-w-full truncate font-mono font-bold hover:text-emerald-700 ${
                  identity.name ? "text-muted text-xs sm:text-sm" : "text-strong text-lg sm:text-2xl"
                }`}
                title={t("creatorStats.copyAddress")}
                onClick={() => {
                  navigator.clipboard?.writeText(address);
                  toastSuccess(t("creatorStats.addressCopied"));
                }}
              >
                {address}
              </button>
              {isMe && (
                <button
                  type="button"
                  className="text-accent mt-2 inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                  onClick={() => setNameFormOpen(true)}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  {identity.profileName ? t("profile.edit") : t("profile.add")}
                </button>
              )}
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {verifiedCount > 0 && <VerifiedBadge />}
                {activeVoting > 0 && (
                  <span className="badge-amber">{t("creatorStats.activeVoting", { count: activeVoting })}</span>
                )}
                {reportCount > 0 && (
                  <span className="badge-rose">⚠ {t("moderation.reportedTimes", { count: reportCount })}</span>
                )}
              </div>
            </div>
          </div>

          <StatGrid stats={stats} className="mt-8 grid-cols-2 lg:grid-cols-4" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {!campaigns ? (
          <Loader />
        ) : created.length === 0 ? (
          <EmptyState
            icon={<SparklesIcon />}
            title={t("creatorStats.emptyTitle")}
            description={t("creatorStats.emptyText")}
          />
        ) : (
          <>
            <DailyDonationsChart donations={donations} />
            <div>
              <h2 className="text-strong mb-4 text-lg font-bold">{t("creatorStats.campaignList")}</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {created.map((campaign) => (
                  <CampaignCard key={campaign.address} campaign={campaign} isMine={isMe} />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <Modal
        open={nameFormOpen}
        onClose={() => setNameFormOpen(false)}
        title={t("profile.title")}
        description={t("profile.description")}
      >
        <DisplayNameForm currentName={identity.profileName} onDone={() => setNameFormOpen(false)} />
      </Modal>
    </>
  );
};

export default CreatorProfile;
