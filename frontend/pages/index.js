import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import CampaignSlides from "../components/landing/CampaignSlides";
import FlowStory from "../components/landing/FlowStory";
import {
  CampaignBuilderChapter,
  CtaChapter,
  DonationTrackChapter,
  FeatureStackChapter,
  StatsChapter,
  VoteChapter,
  WalletChapter,
} from "../components/landing/chapters";
import { constellation, contract, dataWave, flow, heart, sphere, voteBars, wallet } from "../components/landing/shapes";
import Logo from "../components/layout/Logo";
import PreferenceControls from "../components/layout/PreferenceControls";
import { useI18n } from "../components/providers/PreferencesProvider";
import { HandsIcon, WalletIcon } from "../components/ui/Icons";
import { useWallet } from "../hooks/useWallet";
import { loadDonationsForCampaigns } from "../lib/contracts";
import { selectCampaigns } from "../store/campaigns";
import { reportError } from "../lib/log";

// Posisi & ukuran bentuk partikel per bab (x, y = pusat di layar 0..1; scale terhadap sisi terpendek)
// Di layar kecil teks mengalir di atas partikel, jadi bentuk dibuat lebih redup di tengah layar
const MOBILE_BACKDROP = { x: 0.5, y: 0.5, scale: 0.42, alpha: 0.3 };
const LAYOUTS = {
  hero: {
    desktop: { x: 0.72, y: 0.54, scale: 0.46, alpha: 0.35 },
    mobile: { x: 0.5, y: 0.32, scale: 0.46, alpha: 0.25 },
  },
  wallet: { desktop: { x: 0.28, y: 0.52, scale: 0.28 }, mobile: MOBILE_BACKDROP },
  contract: { desktop: { x: 0.72, y: 0.5, scale: 0.5, alpha: 0.25 }, mobile: MOBILE_BACKDROP },
  flow: { desktop: { x: 0.5, y: 0.62, scale: 0.55, alpha: 0.5 }, mobile: { x: 0.5, y: 0.62, scale: 0.5, alpha: 0.35 } },
  vote: {
    desktop: { x: 0.5, y: 0.55, scale: 0.6, alpha: 0.18 },
    mobile: { x: 0.5, y: 0.55, scale: 0.55, alpha: 0.15 },
  },
  stats: { desktop: { x: 0.5, y: 0.5, scale: 0.55, alpha: 0.3 }, mobile: { x: 0.5, y: 0.5, scale: 0.4, alpha: 0.2 } },
  features: {
    desktop: { x: 0.5, y: 0.5, scale: 0.6, alpha: 0.45 },
    mobile: { x: 0.5, y: 0.5, scale: 0.5, alpha: 0.3 },
  },
  cta: { desktop: { x: 0.5, y: 0.5, scale: 0.34, alpha: 0.6 }, mobile: { x: 0.5, y: 0.45, scale: 0.4, alpha: 0.4 } },
};

// Warna grup partikel [utama, kedua] per bab (token --l-*)
const COLORS = {
  hero: ["neon", "violet"],
  wallet: ["neon", "violet"],
  contract: ["violet", "neon"],
  flow: ["gold", "neon"],
  vote: ["neon", "violet"],
  stats: ["neon", "violet"],
  features: ["violet", "neon"],
  cta: ["rose", "violet"],
};

const RECENT_DONATIONS = 10;

/** Judul yang tiap katanya muncul bergantian saat halaman dibuka */
const KineticLine = ({ text, startIndex, className = "" }) => (
  <span className={`block ${className}`}>
    {text.split(" ").map((word, index) => (
      <span key={`${word}-${index}`} className="l-word mr-[0.22em]" style={{ "--i": startIndex + index }}>
        {word}
      </span>
    ))}
  </span>
);

const Header = ({ onStart, isConnecting }) => {
  const { t } = useI18n();
  return (
    <header
      className="l-line fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl"
      style={{ background: "color-mix(in srgb, var(--l-paper) 72%, transparent)" }}
    >
      <div className="l-progress absolute inset-x-0 bottom-0 h-px" />
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo href="/" />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="hidden text-sm font-semibold hover:underline md:inline">
            {t("nav.explore")}
          </Link>
          <Link href="/stats" className="hidden text-sm font-semibold hover:underline md:inline">
            {t("nav.stats")}
          </Link>
          <PreferenceControls />
          <button className="l-btn-primary hidden px-4 py-2 sm:inline-flex" onClick={onStart} disabled={isConnecting}>
            <WalletIcon className="h-4 w-4" />
            {t("wallet.connect")}
          </button>
        </nav>
      </div>
    </header>
  );
};

const Home = () => {
  const { t } = useI18n();
  const router = useRouter();
  const campaigns = useSelector(selectCampaigns);
  const { account, walletType, connect, isConnecting } = useWallet();
  const [chapter, setChapter] = useState(0);

  // Dompet MetaMask sudah terhubung -> langsung ke daftar kampanye
  useEffect(() => {
    if (account && walletType === "metamask") router.push("/dashboard");
  }, [account, walletType, router]);

  // Mode dev (tanpa MetaMask di jaringan lokal) langsung masuk; selain itu minta akses MetaMask dulu
  const start = async () => {
    if (walletType === "dev" || (await connect())) router.push("/dashboard");
  };

  const visible = campaigns?.filter((campaign) => !campaign.isTakenDown);
  const stats = visible
    ? {
        total: visible.length,
        raised: visible.reduce((sum, campaign) => sum + campaign.raisedAmount, 0),
        active: visible.filter((campaign) => !campaign.isCancelled && campaign.deadline * 1000 > Date.now()).length,
        voting: visible.reduce((sum, campaign) => sum + campaign.activeVotingCount, 0),
      }
    : { total: null, raised: null, active: null, voting: null };

  // Donasi terbaru (dengan pesan) untuk lintasan bukti donasi.
  // Daftar kampanye diperbarui tiap blok baru, jadi effect hanya bergantung pada daftar alamatnya;
  // judul kampanye dibaca lewat ref agar tidak ikut memicu pemuatan ulang.
  const [donations, setDonations] = useState(null);
  const addressKey = (visible || []).map((campaign) => campaign.address).join(",");
  const titlesRef = useRef({});
  titlesRef.current = Object.fromEntries((visible || []).map((campaign) => [campaign.address, campaign.title]));

  useEffect(() => {
    if (!addressKey) return;
    loadDonationsForCampaigns(addressKey.split(","))
      .then((list) =>
        setDonations(
          list
            .slice(-RECENT_DONATIONS)
            .reverse()
            .map((donation) => ({ ...donation, campaignTitle: titlesRef.current[donation.campaignAddress] })),
        ),
      )
      .catch((error) => {
        reportError("Memuat donasi terbaru", error);
        setDonations([]);
      });
  }, [addressKey]);

  // Bentuk & tata letak tidak berubah; hanya konten (bahasa, statistik) yang ikut dirender ulang
  const engineChapters = useMemo(
    () =>
      [
        ["mulai", sphere, "hero"],
        ["dompet", wallet, "wallet"],
        ["contract", contract, "contract"],
        ["donasi", flow, "flow"],
        ["voting", voteBars, "vote"],
        ["statistik", dataWave, "stats"],
        ["fitur", constellation, "features"],
        ["gabung", heart, "cta"],
      ].map(([id, shape, key]) => ({ id, shape, layout: LAYOUTS[key], colors: COLORS[key] })),
    [],
  );

  const chapters = [
    {
      id: "mulai",
      label: t("landing.chapterStart"),
      motion: "parallax",
      content: (
        <div className="grid items-center gap-5 md:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="l-line l-raised hidden items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] sm:inline-flex sm:text-xs">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--l-neon)" }} />
              {t("landing.eyebrow")}
            </p>
            <h1 className="text-[clamp(2.4rem,10vw,7rem)] font-extrabold leading-[0.95] tracking-tighter sm:mt-6 lg:text-[clamp(3.5rem,6.6vw,7rem)]">
              <KineticLine text={t("landing.heroLine1")} startIndex={0} />
              <KineticLine text={t("landing.heroLine2")} startIndex={2} className="l-outline" />
              <span className="block">
                <span className="l-word" style={{ "--i": 4 }}>
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: "linear-gradient(90deg, var(--l-neon), var(--l-violet))" }}
                  >
                    {t("landing.heroLine3")}
                  </span>
                </span>
              </span>
            </h1>
            <p className="l-muted mt-6 hidden max-w-lg text-base leading-relaxed sm:block sm:text-lg">
              {t("landing.subtitle")}
            </p>
            <div className="mt-5 flex gap-3 sm:mt-8">
              <button
                className="l-btn-primary flex-1 px-4 py-3 text-sm sm:flex-none sm:px-7 sm:py-4 sm:text-base"
                onClick={start}
                disabled={isConnecting}
              >
                <Image src="/metamask-fox.svg" alt="" width={20} height={20} />
                {isConnecting ? t("wallet.connecting") : t("landing.connectMetaMask")}
              </button>
              <Link
                href="/dashboard"
                className="l-btn-ghost flex-1 px-4 py-3 text-sm sm:flex-none sm:px-7 sm:py-4 sm:text-base"
              >
                {t("nav.explore")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="order-1 mx-auto w-full max-w-[21rem] sm:max-w-sm lg:order-2 lg:max-w-md">
            <CampaignSlides paused={chapter !== 0} />
          </div>
        </div>
      ),
    },
    { id: "dompet", label: t("landing.step1Title"), motion: "parallax", content: <WalletChapter /> },
    {
      id: "contract",
      label: t("landing.step2Title"),
      sticky: true,
      minHeight: "240vh",
      content: <CampaignBuilderChapter />,
    },
    {
      id: "donasi",
      label: t("landing.step3Title"),
      sticky: true,
      minHeight: "300vh",
      content: <DonationTrackChapter donations={donations} />,
    },
    { id: "voting", label: t("landing.step4Title"), sticky: true, minHeight: "240vh", content: <VoteChapter /> },
    {
      id: "statistik",
      label: t("landing.statsEyebrow"),
      minHeight: "110vh",
      content: <StatsChapter stats={stats} start={chapter >= 5} />,
    },
    { id: "fitur", label: t("landing.bentoEyebrow"), content: <FeatureStackChapter /> },
    {
      id: "gabung",
      label: t("landing.ctaButton"),
      minHeight: "130vh",
      content: <CtaChapter onStart={start} isConnecting={isConnecting} />,
    },
  ];

  return (
    <div className="landing relative min-h-screen overflow-x-clip">
      <Head>
        <title>{t("landing.pageTitle")}</title>
      </Head>
      <div className="l-grain" aria-hidden="true" />
      <Header onStart={start} isConnecting={isConnecting} />

      <main>
        <FlowStory chapters={chapters} engineChapters={engineChapters} onChapterChange={setChapter} />
      </main>

      <footer className="l-line border-t">
        <div className="l-muted mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 font-semibold" style={{ color: "var(--l-ink)" }}>
            <HandsIcon className="l-accent h-4 w-4" />
            Himpun
          </span>
          <p>{t("footer.tagline")}</p>
        </div>
      </footer>
    </div>
  );
};

Home.withLayout = false;

export default Home;
