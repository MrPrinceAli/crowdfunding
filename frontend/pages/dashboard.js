import Head from "next/head";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import CampaignCard from "../components/campaign/CampaignCard";
import CampaignForm from "../components/campaign/CampaignForm";
import EmptyState from "../components/ui/EmptyState";
import { HeartIcon, PlusIcon, SearchIcon } from "../components/ui/Icons";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import StatGrid from "../components/ui/StatGrid";
import { campaignStatus } from "../lib/campaign";
import { formatEth, sameAddress } from "../lib/format";
import { selectCampaigns } from "../store/campaigns";
import { selectAccount } from "../store/wallet";

const FILTERS = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "successful", label: "Berhasil" },
  { key: "ended", label: "Berakhir" },
];

const Dashboard = () => {
  const campaigns = useSelector(selectCampaigns);
  const account = useSelector(selectAccount);
  const [formOpen, setFormOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const visibleCampaigns = useMemo(() => {
    const keyword = search.toLowerCase();
    return [...(campaigns || [])]
      .reverse()
      .filter((campaign) => filter === "all" || campaignStatus(campaign).key === filter)
      .filter((campaign) => `${campaign.title} ${campaign.description}`.toLowerCase().includes(keyword));
  }, [campaigns, filter, search]);

  const totalRaised = (campaigns || []).reduce((sum, campaign) => sum + campaign.raisedAmount, 0);
  const activeCount = (campaigns || []).filter((campaign) => campaignStatus(campaign).key === "active").length;

  const stats = [
    { label: "Total kampanye", value: campaigns?.length ?? "–" },
    { label: "Kampanye aktif", value: campaigns ? activeCount : "–" },
    { label: "Dana terkumpul", value: campaigns ? formatEth(totalRaised) : "–", eth: campaigns ? totalRaised : null },
  ];

  const createButton = (
    <button className="btn-primary px-6 py-3" onClick={() => setFormOpen(true)} disabled={!account}>
      <PlusIcon className="h-5 w-5" />
      Buat Kampanye
    </button>
  );

  return (
    <>
      <Head>
        <title>Jelajahi Kampanye — Crowdfunding</title>
      </Head>

      <section className="border-b border-slate-200/70 bg-gradient-to-b from-emerald-50/80 to-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Jelajahi kampanye</h1>
              <p className="mt-2 max-w-xl text-slate-600">
                Dukung ide dan aksi sosial yang kamu pedulikan, atau mulai penggalangan danamu sendiri.
              </p>
            </div>
            {createButton}
          </div>
          <StatGrid stats={stats} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                className={`tab ${filter === item.key ? "tab-active" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kampanye..."
              className="input pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-8">
          {!campaigns ? (
            <Loader />
          ) : visibleCampaigns.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.address}
                  campaign={campaign}
                  isMine={sameAddress(campaign.creator, account)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<HeartIcon />}
              title={campaigns.length > 0 ? "Kampanye tidak ditemukan" : "Belum ada kampanye"}
              description={
                campaigns.length > 0
                  ? "Coba ubah filter atau kata kunci pencarian."
                  : "Jadilah yang pertama memulai penggalangan dana di platform ini."
              }
              action={campaigns.length === 0 && createButton}
            />
          )}
        </div>
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Mulai galang dana"
        description="Sajikan informasi yang jelas dan inspiratif agar lebih banyak orang tergerak untuk membantu."
      >
        <CampaignForm onCreated={() => setFormOpen(false)} />
      </Modal>
    </>
  );
};

export default Dashboard;
