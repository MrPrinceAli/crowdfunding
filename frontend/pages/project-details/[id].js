import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CampaignCover from "../../components/campaign/CampaignCover";
import ContributorList from "../../components/campaign/ContributorList";
import DonationPanel from "../../components/campaign/DonationPanel";
import EmptyState from "../../components/ui/EmptyState";
import { ArrowLeftIcon, ArrowPathIcon, HeartIcon } from "../../components/ui/Icons";
import Loader from "../../components/ui/Loader";
import WithdrawRequestCard from "../../components/withdraw/WithdrawRequestCard";
import { VOTING_PERIOD_DAYS } from "../../lib/campaign";
import { loadContributors, loadWithdrawRequests } from "../../lib/contracts";
import { formatDate, sameAddress, shortAddress } from "../../lib/format";
import { refreshCampaign, selectCampaign, selectCampaigns } from "../../store/campaigns";
import { selectAccount, selectWeb3 } from "../../store/wallet";

const REFRESH_INTERVAL = 30000;

const CampaignDetail = () => {
  const { id: address } = useRouter().query;
  const dispatch = useDispatch();
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const campaigns = useSelector(selectCampaigns);
  const campaign = useSelector(selectCampaign(address));

  const [contributors, setContributors] = useState(null);
  const [withdrawRequests, setWithdrawRequests] = useState(null);

  const reloadRequests = useCallback(() => {
    if (!web3 || !address) return;
    loadWithdrawRequests(web3, address)
      .then(setWithdrawRequests)
      .catch((error) => {
        console.error(error);
        setWithdrawRequests((current) => current || []);
      });
  }, [web3, address]);

  /** Muat ulang semua data dari blockchain setelah donasi / aksi penarikan dana */
  const reloadAll = useCallback(() => {
    if (!web3 || !address) return;
    loadContributors(web3, address)
      .then(setContributors)
      .catch(() => setContributors([]));
    reloadRequests();
    dispatch(refreshCampaign(address)).catch(console.error);
  }, [web3, address, dispatch, reloadRequests]);

  useEffect(() => {
    reloadAll();
    // Status voting berubah seiring waktu (batas waktu voting), jadi diperbarui berkala
    const timer = setInterval(reloadRequests, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [reloadAll, reloadRequests]);

  if (!campaigns) return <Loader />;

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={<HeartIcon />}
          title="Kampanye tidak ditemukan"
          description="Alamat kontrak ini tidak terdaftar di platform."
          action={
            <Link href="/dashboard" className="btn-primary">
              Kembali ke daftar kampanye
            </Link>
          }
        />
      </div>
    );
  }

  const contributorCount = contributors?.length ?? campaign.contributorCount;
  const isDonor = Boolean(contributors?.some((item) => sameAddress(item.contributor, account)));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Head>
        <title>{`${campaign.title} — Crowdfunding`}</title>
      </Head>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Kembali
      </Link>

      {/* Di layar kecil urutannya: header -> panel donasi -> konten */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3 lg:grid-rows-[auto_1fr]">
        <div className="space-y-8 lg:col-span-2">
          <CampaignCover
            address={campaign.address}
            className="h-56 rounded-3xl sm:h-72"
            iconClassName="-bottom-10 -right-8 h-64 w-64"
          />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{campaign.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span>
                Penggalang dana <span className="font-semibold text-slate-700">{shortAddress(campaign.creator)}</span>
              </span>
              <span>
                Batas waktu <span className="font-semibold text-slate-700">{formatDate(campaign.deadline)}</span>
              </span>
              <span className="truncate">
                Kontrak <span className="font-mono text-xs text-slate-700">{shortAddress(campaign.address)}</span>
              </span>
            </div>
          </div>
        </div>

        <aside className="space-y-6 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <DonationPanel campaign={campaign} onChanged={reloadAll} />
          <ContributorList contributors={contributors} />
        </aside>

        <div className="space-y-8 lg:col-span-2">
          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold text-slate-900">Tentang kampanye</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{campaign.description}</p>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <ArrowPathIcon className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-bold text-slate-900">Permintaan penarikan dana</h2>
            </div>
            <div className="mt-4 space-y-3">
              {!withdrawRequests ? (
                <Loader />
              ) : withdrawRequests.length === 0 ? (
                <EmptyState
                  title="Belum ada permintaan penarikan"
                  description={`Penggalang dana dapat mengajukan penarikan kapan saja, lalu donatur memberikan suara selama ${VOTING_PERIOD_DAYS} hari.`}
                />
              ) : (
                withdrawRequests.map((request) => (
                  <WithdrawRequestCard
                    key={request.id}
                    request={request}
                    campaign={campaign}
                    contributorCount={contributorCount}
                    isDonor={isDonor}
                    onChanged={reloadAll}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignDetail;
