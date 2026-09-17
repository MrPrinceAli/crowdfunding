import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import ActivityTimeline from "../../components/campaign/ActivityTimeline";
import AppealPanel from "../../components/campaign/AppealPanel";
import CampaignCover from "../../components/campaign/CampaignCover";
import CampaignUpdates from "../../components/campaign/CampaignUpdates";
import ContributorList from "../../components/campaign/ContributorList";
import CreatorTools from "../../components/campaign/CreatorTools";
import DonationChart from "../../components/campaign/DonationChart";
import DonationPanel from "../../components/campaign/DonationPanel";
import EditHistory from "../../components/campaign/EditHistory";
import ModerationPanel from "../../components/campaign/ModerationPanel";
import SupportMessages from "../../components/campaign/SupportMessages";
import { useI18n } from "../../components/providers/PreferencesProvider";
import EmptyState from "../../components/ui/EmptyState";
import ErrorState from "../../components/ui/ErrorState";
import AddressName from "../../components/ui/AddressName";
import FavoriteButton from "../../components/ui/FavoriteButton";
import { ArrowLeftIcon, ArrowPathIcon, BanIcon, HandsIcon, MapPinIcon } from "../../components/ui/Icons";
import Loader from "../../components/ui/Loader";
import ShareButton from "../../components/ui/ShareButton";
import VerifiedBadge from "../../components/ui/VerifiedBadge";
import WithdrawRequestCard from "../../components/withdraw/WithdrawRequestCard";
import { useBlockRefresh } from "../../hooks/useBlockRefresh";
import { VOTING_PERIOD_DAYS } from "../../lib/campaign";
import {
  loadAccountCampaignInfo,
  loadActivity,
  loadDonations,
  loadReports,
  loadUpdates,
  loadWithdrawRequests,
} from "../../lib/contracts";
import { formatDate, formatDateTime, sameAddress, shortAddress } from "../../lib/format";
import { loadCampaignPreview, previewImageUrl, requestOrigin } from "../../lib/og";
import { groupByContributor } from "../../lib/stats";
import { refreshCampaign, selectCampaign, selectCampaigns, selectCampaignsError } from "../../store/campaigns";
import { selectAccount } from "../../store/wallet";
import { onError, reportError } from "../../lib/log";

/** Meta tag pratinjau link (dibaca di server agar WhatsApp/X bisa menampilkan judul & gambar) */
export const getServerSideProps = async ({ params, req }) => {
  const preview = await loadCampaignPreview(params.id);
  if (!preview) return { props: { og: null } };
  const origin = requestOrigin(req);
  return {
    props: {
      og: {
        title: preview.title,
        description: preview.description,
        image: previewImageUrl(origin, preview),
        url: `${origin}/project-details/${params.id}`,
      },
    },
  };
};

const PreviewMeta = ({ og }) =>
  og && (
    <Head>
      <meta property="og:title" content={og.title} />
      <meta property="og:description" content={og.description} />
      <meta property="og:image" content={og.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={og.url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={og.title} />
      <meta name="twitter:description" content={og.description} />
      <meta name="twitter:image" content={og.image} />
    </Head>
  );

/** Pemberitahuan kampanye dibatalkan / dihentikan admin, beserta alasannya dari blockchain */
const CancellationNotice = ({ campaign, activity, onChanged }) => {
  const { t } = useI18n();
  if (!campaign.isCancelled) return null;
  const event = activity?.find((item) => item.type === "campaignCancelled" || item.type === "takenDown");
  const appealAccepted = campaign.appealStatus === "Accepted";
  const prefix = campaign.cancelledByAdmin ? "takedown" : "cancel";

  return (
    <div
      className={`${appealAccepted ? "notice-amber" : "notice-rose"} mt-6 flex items-start gap-3 p-4 sm:p-5`}
      role="status"
    >
      <BanIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{appealAccepted ? t("takedown.noticeTitleLifted") : t(`${prefix}.noticeTitle`)}</p>
        {event && (
          <>
            <p className="mt-1 whitespace-pre-line break-words text-sm">
              {t("cancel.noticeReason")}: “{event.text}”
            </p>
            <p className="mt-1 text-xs opacity-80">{formatDateTime(event.time)}</p>
          </>
        )}
        <p className="mt-2 text-sm">{t("cancel.noticeRefund")}</p>
        <AppealPanel campaign={campaign} onChanged={onChanged} />
      </div>
    </div>
  );
};

const CampaignDetail = ({ og }) => {
  const { t } = useI18n();
  const { id: address } = useRouter().query;
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  const campaigns = useSelector(selectCampaigns);
  const campaignsError = useSelector(selectCampaignsError);
  const campaign = useSelector(selectCampaign(address));

  const [donations, setDonations] = useState(null);
  const [withdrawRequests, setWithdrawRequests] = useState(null);
  const [updates, setUpdates] = useState(null);
  const [reports, setReports] = useState(null);
  const [activity, setActivity] = useState(null);
  const [accountInfo, setAccountInfo] = useState(null);

  /** Muat semua data halaman dari blockchain (awal, setelah aksi, dan setiap ada blok baru) */
  const reloadAll = useCallback(() => {
    if (!address) return;
    const keep = (label, setter) => (error) => {
      reportError(label, error);
      setter((current) => current || []);
    };
    loadDonations(address).then(setDonations).catch(keep("Memuat donasi", setDonations));
    loadWithdrawRequests(address)
      .then(setWithdrawRequests)
      .catch(keep("Memuat permintaan penarikan", setWithdrawRequests));
    loadUpdates(address).then(setUpdates).catch(keep("Memuat kabar", setUpdates));
    loadReports(address).then(setReports).catch(keep("Memuat laporan", setReports));
    loadActivity(address).then(setActivity).catch(keep("Memuat riwayat aktivitas", setActivity));
    if (account) loadAccountCampaignInfo(address, account).then(setAccountInfo).catch(onError("Memuat data akun"));
    dispatch(refreshCampaign(address)).catch(onError("Memuat kampanye"));
  }, [address, account, dispatch]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useBlockRefresh(reloadAll);

  const contributors = useMemo(() => donations && groupByContributor(donations), [donations]);

  const content = () => {
    if (!campaigns) {
      return campaignsError ? (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <ErrorState title={t("dashboard.loadError")} description={campaignsError} />
        </div>
      ) : (
        <Loader />
      );
    }

    if (!campaign) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <EmptyState
            icon={<HandsIcon />}
            title={t("detail.notFoundTitle")}
            description={t("detail.notFoundText")}
            action={
              <Link href="/dashboard" className="btn-primary">
                {t("detail.backToList")}
              </Link>
            }
          />
        </div>
      );
    }

    const isDonor = Boolean(contributors?.some((item) => sameAddress(item.contributor, account)));
    const isCreator = sameAddress(campaign.creator, account);

    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Head>
          <title>{`${campaign.title} — Himpun`}</title>
        </Head>

        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-muted inline-flex items-center gap-2 text-sm font-semibold hover:text-slate-900 dark:hover:text-slate-100"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("common.back")}
          </Link>
          <div className="flex items-center gap-2">
            <FavoriteButton address={campaign.address} className="border border-slate-200 dark:border-slate-700" />
            <ShareButton address={campaign.address} title={campaign.title} />
          </div>
        </div>

        <CancellationNotice campaign={campaign} activity={activity} onChanged={reloadAll} />

        {/* Di layar kecil urutannya: header -> panel donasi -> konten */}
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
          <div className="space-y-8 lg:col-span-2">
            <CampaignCover
              address={campaign.address}
              imageUrl={campaign.imageUrl}
              className="h-56 rounded-3xl sm:h-80"
              iconClassName="-bottom-10 -right-8 h-64 w-64"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-emerald">{t(`category.${campaign.category}`)}</span>
                {campaign.location && (
                  <span className="badge-slate gap-1">
                    <MapPinIcon className="h-3.5 w-3.5" />
                    {t(`province.${campaign.location}`)}
                  </span>
                )}
                {campaign.isVerified && <VerifiedBadge />}
                {campaign.reportCount > 0 && (
                  <span className="badge-rose">⚠ {t("moderation.reportedTimes", { count: campaign.reportCount })}</span>
                )}
                {campaign.deadlineExtended && <span className="badge-amber">{t("detail.extendedBadge")}</span>}
                {campaign.closedEarly && <span className="badge-slate">{t("detail.closedEarlyBadge")}</span>}
                {campaign.isCancelled && (
                  <span className={campaign.isTakenDown ? "badge-rose" : "badge-slate"}>
                    {t(campaign.isTakenDown ? "status.takenDown" : "status.cancelled")}
                  </span>
                )}
                {campaign.appealStatus === "Accepted" && <span className="badge-amber">{t("appeal.liftedBadge")}</span>}
                {campaign.appealStatus === "Pending" && <span className="badge-amber">{t("appeal.pendingBadge")}</span>}
              </div>
              <h1 className="text-strong mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">{campaign.title}</h1>
              <div className="text-muted mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span>
                  {t("detail.fundraiser")}{" "}
                  <AddressName
                    address={campaign.creator}
                    href={`/creators/${campaign.creator}`}
                    withAddress
                    className="text-accent font-semibold hover:underline"
                  />
                </span>
                <span>
                  {t("detail.deadline")}{" "}
                  <span className="text-body font-semibold">{formatDate(campaign.deadline)}</span>
                </span>
                <span className="truncate">
                  {t("detail.contract")}{" "}
                  <span className="text-body font-mono text-xs">{shortAddress(campaign.address)}</span>
                </span>
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <DonationPanel campaign={campaign} accountInfo={accountInfo} onChanged={reloadAll} />
            {isCreator && <CreatorTools campaign={campaign} onChanged={reloadAll} />}
            <ContributorList contributors={contributors} />
            <ModerationPanel campaign={campaign} reports={reports} accountInfo={accountInfo} onChanged={reloadAll} />
          </aside>

          <div className="min-w-0 space-y-8 lg:col-span-2">
            <div className="card p-6 sm:p-8">
              <h2 className="text-strong text-lg font-bold">{t("detail.about")}</h2>
              <p className="text-body mt-3 whitespace-pre-line leading-relaxed">{campaign.description}</p>
              <EditHistory activity={activity} />
            </div>

            <DonationChart campaign={campaign} donations={donations} />
            <SupportMessages donations={donations} />
            <CampaignUpdates
              campaignAddress={campaign.address}
              updates={updates}
              isCreator={isCreator}
              onPosted={reloadAll}
            />

            <div>
              <div className="flex items-center gap-2">
                <ArrowPathIcon className="text-faint h-5 w-5" />
                <h2 className="text-strong text-lg font-bold">{t("detail.withdrawRequests")}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {!withdrawRequests ? (
                  <Loader />
                ) : withdrawRequests.length === 0 ? (
                  <EmptyState
                    title={t("detail.noRequestsTitle")}
                    description={t("detail.noRequestsText", { days: VOTING_PERIOD_DAYS })}
                  />
                ) : (
                  [...withdrawRequests]
                    .reverse()
                    .map((request) => (
                      <WithdrawRequestCard
                        key={request.id}
                        request={request}
                        campaign={campaign}
                        isDonor={isDonor}
                        onChanged={reloadAll}
                      />
                    ))
                )}
              </div>
            </div>

            <ActivityTimeline activity={activity} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <PreviewMeta og={og} />
      {content()}
    </>
  );
};

export default CampaignDetail;
