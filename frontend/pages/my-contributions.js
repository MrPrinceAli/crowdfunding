import Head from "next/head";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import CampaignCard from "../components/campaign/CampaignCard";
import EmptyState from "../components/ui/EmptyState";
import IdrValue from "../components/ui/IdrValue";
import { HeartIcon, SparklesIcon } from "../components/ui/Icons";
import Loader from "../components/ui/Loader";
import StatGrid from "../components/ui/StatGrid";
import PendingVotes from "../components/withdraw/PendingVotes";
import { coverGradient } from "../lib/campaign";
import { loadMyContributions, loadPendingVotes } from "../lib/contracts";
import { formatEth, sameAddress, shortAddress } from "../lib/format";
import { selectCampaigns } from "../store/campaigns";
import { selectAccount, selectWeb3 } from "../store/wallet";

const TABS = ["Riwayat donasi", "Kampanye saya"];

const DonationHistory = ({ contributions, campaigns }) => {
  if (!contributions) return <Loader />;

  if (contributions.length === 0) {
    return (
      <EmptyState
        icon={<HeartIcon />}
        title="Belum ada donasi"
        description="Kamu belum berdonasi ke kampanye mana pun. Yuk mulai bantu sesama!"
        action={
          <Link href="/dashboard" className="btn-primary">
            Jelajahi kampanye
          </Link>
        }
      />
    );
  }

  return (
    <div className="card divide-y divide-slate-100">
      {[...contributions].reverse().map((contribution, index) => {
        const campaign = campaigns?.find((item) => item.address === contribution.campaignAddress);
        return (
          <Link
            key={index}
            href={`/project-details/${contribution.campaignAddress}`}
            className="flex items-center gap-4 p-4 transition hover:bg-slate-50 sm:p-5"
          >
            <span
              className={`h-12 w-12 flex-shrink-0 rounded-xl bg-gradient-to-br ${coverGradient(contribution.campaignAddress)}`}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{campaign?.title ?? "Kampanye"}</p>
              <p className="truncate font-mono text-xs text-slate-500">{shortAddress(contribution.campaignAddress)}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-emerald-600">+{formatEth(contribution.amount)}</p>
              <IdrValue eth={contribution.amount} />
            </div>
          </Link>
        );
      })}
    </div>
  );
};

const MyCampaigns = ({ campaigns }) => {
  if (!campaigns) return <Loader />;

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<SparklesIcon />}
        title="Belum ada kampanye"
        description="Kamu belum membuat kampanye penggalangan dana."
        action={
          <Link href="/dashboard" className="btn-primary">
            Buat kampanye
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
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const campaigns = useSelector(selectCampaigns);
  const [tab, setTab] = useState(0);
  const [contributions, setContributions] = useState(null);
  const [pendingVotes, setPendingVotes] = useState(null);

  const myCampaigns = useMemo(
    () => campaigns?.filter((campaign) => sameAddress(campaign.creator, account)),
    [campaigns, account],
  );

  useEffect(() => {
    if (!web3 || !account) return;
    loadMyContributions(web3, account)
      .then(setContributions)
      .catch((error) => {
        console.error(error);
        setContributions([]);
      });
  }, [web3, account]);

  // Permintaan penarikan dana yang menunggu suara dari akun ini
  useEffect(() => {
    if (!web3 || !account || !contributions) return;
    const campaignAddresses = [...new Set(contributions.map((item) => item.campaignAddress))];
    loadPendingVotes(web3, account, campaignAddresses)
      .then(setPendingVotes)
      .catch((error) => {
        console.error(error);
        setPendingVotes([]);
      });
  }, [web3, account, contributions]);

  const totalDonated = contributions?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const stats = [
    { label: "Donasi diberikan", value: contributions?.length ?? 0 },
    { label: "Kampanye saya", value: myCampaigns?.length ?? 0 },
    { label: "Total donasi", value: formatEth(totalDonated), eth: totalDonated },
  ];

  return (
    <>
      <Head>
        <title>Kontribusi Saya — Crowdfunding</title>
      </Head>

      <section className="border-b border-slate-200/70 bg-gradient-to-b from-emerald-50/80 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className={`h-14 w-14 flex-shrink-0 rounded-2xl bg-gradient-to-br ${coverGradient(account || "")}`} />
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Kontribusi saya</h1>
              <p className="mt-1 truncate font-mono text-sm text-slate-500">{account || "Dompet belum terhubung"}</p>
            </div>
          </div>
          <StatGrid stats={stats} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PendingVotes requests={pendingVotes} />

        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {TABS.map((label, index) => (
            <button key={label} className={`tab ${tab === index ? "tab-active" : ""}`} onClick={() => setTab(index)}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 0 ? (
            <DonationHistory contributions={contributions} campaigns={campaigns} />
          ) : (
            <MyCampaigns campaigns={myCampaigns} />
          )}
        </div>
      </section>
    </>
  );
};

export default MyContributions;
