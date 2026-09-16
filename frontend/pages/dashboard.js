import Head from "next/head";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import CampaignCard from "../components/campaign/CampaignCard";
import CampaignForm from "../components/campaign/CampaignForm";
import { useIdentity } from "../components/providers/IdentityProvider";
import { useI18n } from "../components/providers/PreferencesProvider";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import { HandsIcon, MapPinIcon, PlusIcon, SearchIcon } from "../components/ui/Icons";
import Loader from "../components/ui/Loader";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import StatGrid from "../components/ui/StatGrid";
import { useWallet } from "../hooks/useWallet";
import { CATEGORIES, campaignStatus, paginate, PROVINCES, SORT_OPTIONS, sortCampaigns } from "../lib/campaign";
import { useFavorites } from "../lib/favorites";
import { formatEth, sameAddress } from "../lib/format";
import { store } from "../store";
import { loadAllCampaigns, selectCampaigns, selectCampaignsError } from "../store/campaigns";

const STATUS_FILTERS = ["all", "active", "successful", "ended", "favorites"];

const Dashboard = () => {
  const { t } = useI18n();
  const allCampaigns = useSelector(selectCampaigns);
  // Kampanye yang di-takedown admin tidak ditampilkan di halaman jelajahi (halaman detailnya tetap bisa dibuka)
  const campaigns = useMemo(() => allCampaigns?.filter((campaign) => !campaign.isTakenDown), [allCampaigns]);
  const { identityOf } = useIdentity((campaigns || []).map((campaign) => campaign.creator));
  const error = useSelector(selectCampaignsError);
  const wallet = useWallet();
  const { favorites, isFavorite } = useFavorites();
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [province, setProvince] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Setiap filter berubah, kembali ke halaman pertama
  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const matchesStatus = (campaign) =>
      status === "all" ||
      (status === "favorites"
        ? isFavorite(campaign.address)
        : status === "ended"
          ? ["ended", "cancelled"].includes(campaignStatus(campaign).key)
          : campaignStatus(campaign).key === status);
    // Kata kunci dicocokkan dengan judul, cerita, nama profil/ENS penggalang dana, dan alamat dompetnya
    const matchesKeyword = (campaign) => {
      if (!keyword) return true;
      const creator = identityOf(campaign.creator);
      return [campaign.title, campaign.description, creator.profileName, creator.ensName, campaign.creator]
        .filter(Boolean)
        .some((text) => text.toLowerCase().includes(keyword));
    };
    const matches = (campaigns || []).filter(
      (campaign) =>
        matchesStatus(campaign) &&
        (category === "all" || campaign.category === category) &&
        (province === "all" || campaign.location === province) &&
        matchesKeyword(campaign),
    );
    return sortCampaigns(matches, sort);
  }, [campaigns, status, category, province, sort, search, isFavorite, identityOf]);

  const pageData = paginate(filtered, page);

  const totalRaised = (campaigns || []).reduce((sum, campaign) => sum + campaign.raisedAmount, 0);
  const activeCount = (campaigns || []).filter((campaign) => campaignStatus(campaign).key === "active").length;
  const stats = [
    { label: t("dashboard.statTotal"), value: campaigns?.length ?? "–" },
    { label: t("dashboard.statActive"), value: campaigns ? activeCount : "–" },
    {
      label: t("dashboard.statRaised"),
      value: campaigns ? formatEth(totalRaised) : "–",
      eth: campaigns ? totalRaised : null,
    },
  ];

  const openForm = async () => {
    if (wallet.account || (await wallet.connect())) setFormOpen(true);
  };

  const createButton = (
    <button className="btn-primary px-6 py-3" onClick={openForm} disabled={wallet.isConnecting}>
      <PlusIcon className="h-5 w-5" />
      {t("dashboard.create")}
    </button>
  );

  const renderList = () => {
    if (!campaigns && error) {
      return (
        <ErrorState
          title={t("dashboard.loadError")}
          description={error}
          action={
            <button className="btn-primary" onClick={() => store.dispatch(loadAllCampaigns())}>
              {t("common.retry")}
            </button>
          }
        />
      );
    }
    if (!campaigns) return <Loader />;
    if (filtered.length === 0) {
      const emptyKey =
        status === "favorites" && favorites.length === 0 ? "favorites" : campaigns.length > 0 ? "filtered" : "none";
      return (
        <EmptyState
          icon={<HandsIcon />}
          title={t(`dashboard.empty.${emptyKey}.title`)}
          description={t(`dashboard.empty.${emptyKey}.description`)}
          action={campaigns.length === 0 && createButton}
        />
      );
    }
    return (
      <>
        <p className="text-muted mb-4 text-sm">{t("dashboard.count", { count: filtered.length })}</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageData.items.map((campaign) => (
            <CampaignCard
              key={campaign.address}
              campaign={campaign}
              isMine={sameAddress(campaign.creator, wallet.account)}
            />
          ))}
        </div>
        <Pagination
          page={pageData.page}
          pageCount={pageData.pageCount}
          onChange={(next) => {
            setPage(next);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </>
    );
  };

  return (
    <>
      <Head>
        <title>{t("dashboard.pageTitle")}</title>
      </Head>

      <section className="page-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-strong text-3xl font-extrabold tracking-tight sm:text-4xl">{t("dashboard.title")}</h1>
              <p className="text-body mt-2 max-w-xl">{t("dashboard.subtitle")}</p>
            </div>
            {createButton}
          </div>
          <StatGrid stats={stats} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="tab-list flex-wrap">
            {STATUS_FILTERS.map((key) => (
              <button
                key={key}
                className={`tab ${status === key ? "tab-active" : ""}`}
                onClick={() => updateFilter(setStatus)(key)}
              >
                {key === "favorites" ? `♥ ${t("dashboard.filter.favorites")}` : t(`dashboard.filter.${key}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative sm:w-60">
              <MapPinIcon className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <select
                aria-label={t("dashboard.provinceLabel")}
                className="input pl-10"
                value={province}
                onChange={(event) => updateFilter(setProvince)(event.target.value)}
              >
                <option value="all">{t("dashboard.allProvinces")}</option>
                {PROVINCES.map((item) => (
                  <option key={item} value={item}>
                    {t(`province.${item}`)}
                  </option>
                ))}
              </select>
            </div>
            <select
              aria-label={t("dashboard.sortLabel")}
              className="input sm:w-40"
              value={sort}
              onChange={(event) => updateFilter(setSort)(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`dashboard.sort.${option}`)}
                </option>
              ))}
            </select>
            <div className="relative sm:w-72">
              <SearchIcon className="text-faint absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t("dashboard.search")}
                className="input pl-10"
                value={search}
                onChange={(event) => updateFilter(setSearch)(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {["all", ...CATEGORIES].map((item) => (
            <button
              key={item}
              onClick={() => updateFilter(setCategory)(item)}
              className={`chip ${category === item ? "chip-active" : ""}`}
            >
              {item === "all" ? t("dashboard.allCategories") : t(`category.${item}`)}
            </button>
          ))}
        </div>

        <div className="mt-8">{renderList()}</div>
      </section>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={t("form.modalTitle")}
        description={t("form.modalDescription")}
      >
        <CampaignForm onCreated={() => setFormOpen(false)} />
      </Modal>
    </>
  );
};

export default Dashboard;
