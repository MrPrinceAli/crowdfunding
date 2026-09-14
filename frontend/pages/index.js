import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CampaignCover from "../components/campaign/CampaignCover";
import Footer from "../components/layout/Footer";
import Logo from "../components/layout/Logo";
import { HeartIcon, ShieldIcon, SparklesIcon, UsersIcon, WalletIcon } from "../components/ui/Icons";
import { QUORUM_PERCENT, VOTING_PERIOD_DAYS } from "../lib/campaign";
import { getErrorMessage, toastError } from "../lib/toast";
import { connectWallet } from "../lib/wallet";
import { initBlockchain, selectAccount } from "../store/wallet";

const FEATURES = [
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: "Transparan di blockchain",
    description: "Setiap donasi dan penarikan tercatat di smart contract dan bisa diperiksa siapa saja.",
  },
  {
    icon: <UsersIcon className="h-6 w-6" />,
    title: "Donatur ikut memutuskan",
    description: `Setiap penarikan dana di-voting donatur: disetujui mayoritas (50%+1), atau mayoritas pemilih setelah ${VOTING_PERIOD_DAYS} hari dengan kuorum ${QUORUM_PERCENT}%.`,
  },
  {
    icon: <WalletIcon className="h-6 w-6" />,
    title: "Tanpa perantara",
    description: "Donasi dikirim langsung dari dompet MetaMask kamu ke kontrak kampanye.",
  },
];

const STEPS = [
  { title: "Hubungkan dompet", description: "Masuk dengan MetaMask di jaringan Hardhat lokal." },
  { title: "Buat atau pilih kampanye", description: "Tentukan target, donasi minimum, dan batas waktu." },
  { title: "Donasi dengan ETH", description: "Progress kampanye langsung diperbarui dari blockchain." },
  { title: "Voting penarikan dana", description: "Donatur menyetujui atau menolak setiap permintaan penarikan." },
];

const Home = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const account = useSelector(selectAccount);
  const [connecting, setConnecting] = useState(false);

  // Dompet sudah terhubung -> langsung ke daftar kampanye
  useEffect(() => {
    if (account) router.push("/dashboard");
  }, [account, router]);

  const connect = async () => {
    setConnecting(true);
    try {
      await connectWallet();
      await dispatch(initBlockchain());
    } catch (error) {
      toastError(`${getErrorMessage(error)}. Pastikan MetaMask sudah di-unlock, lalu coba lagi.`);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Head>
        <title>Crowdfunding — Galang dana transparan</title>
      </Head>

      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo href="/" />
          <button className="btn-secondary hidden sm:inline-flex" onClick={connect} disabled={connecting}>
            <WalletIcon className="h-4 w-4" />
            Hubungkan Dompet
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-white pb-20 pt-32 sm:pt-40">
        <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-300/30 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="text-center lg:text-left">
            <span className="badge gap-1.5 border border-emerald-200 bg-white text-emerald-700">
              <SparklesIcon className="h-3.5 w-3.5" />
              Didukung smart contract Ethereum
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Wujudkan kebaikan bersama,{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                transparan
              </span>{" "}
              sampai ke blockchain.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 lg:mx-0">
              Galang dana untuk ide dan aksi sosialmu, atau dukung kampanye orang lain. Setiap donasi tercatat di
              blockchain dan penarikannya diawasi langsung oleh para donatur.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <button
                className="btn-primary w-full px-7 py-3.5 text-base sm:w-auto"
                onClick={connect}
                disabled={connecting}
              >
                <Image src="/metamask-fox.svg" alt="" width={20} height={20} />
                {connecting ? "Menghubungkan..." : "Hubungkan MetaMask"}
              </button>
              <a href="#cara-kerja" className="btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
                Lihat cara kerja
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              Belum punya MetaMask?{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-emerald-600 hover:underline"
              >
                Pasang ekstensinya
              </a>
            </p>
          </div>

          {/* Ilustrasi kartu kampanye */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-4 rotate-3 rounded-3xl bg-gradient-to-br from-emerald-200 to-teal-100" />
            <div className="card relative overflow-hidden">
              <CampaignCover address="demo" className="h-44" iconClassName="-bottom-8 -right-6 h-40 w-40">
                <span className="badge absolute left-4 top-4 bg-sky-100 text-sky-700">Aktif</span>
              </CampaignCover>
              <div className="p-6">
                <p className="text-lg font-bold text-slate-900">Beasiswa untuk 50 anak di pelosok</p>
                <p className="mt-1 text-sm text-slate-500">Bantu biaya sekolah selama satu tahun penuh.</p>
                <div className="progress-track mt-5">
                  <div className="progress-bar" style={{ width: "72%" }} />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="font-bold text-slate-900">
                    7,2 ETH <span className="font-normal text-slate-500">dari 10 ETH</span>
                  </span>
                  <span className="font-bold text-emerald-600">72%</span>
                </div>
              </div>
            </div>
            <div className="card absolute -right-6 top-28 hidden items-center gap-3 px-4 py-3 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <HeartIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">+0,5 ETH</p>
                <p className="text-xs text-slate-500">donasi baru masuk</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fitur */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card p-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cara kerja */}
      <section id="cara-kerja" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-emerald-600">Cara kerja</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Empat langkah menuju kampanye pertamamu
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <div key={step.title} className="relative rounded-2xl bg-slate-50 p-6">
              <span className="text-4xl font-extrabold text-emerald-200">0{index + 1}</span>
              <h3 className="mt-3 font-bold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-16 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-12 text-center sm:px-12">
          <div className="bg-grid absolute inset-0 opacity-20" />
          <h2 className="relative text-2xl font-extrabold text-white sm:text-3xl">Siap mulai berbuat baik?</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-emerald-50">
            Hubungkan dompetmu dan jelajahi kampanye yang sedang berjalan.
          </p>
          <button
            className="btn relative mt-8 bg-white px-7 py-3.5 text-base text-emerald-700 hover:bg-emerald-50"
            onClick={connect}
            disabled={connecting}
          >
            Mulai Sekarang
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

Home.withLayout = false;

export default Home;
