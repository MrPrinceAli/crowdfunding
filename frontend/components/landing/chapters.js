import Link from "next/link";
import { useCountUp } from "../../hooks/useScrollMotion";
import { ABANDON_PERIOD_DAYS, QUORUM_PERCENT, VOTING_PERIOD_DAYS } from "../../lib/campaign";
import { formatEth, formatNumber, formatShortDate, shortAddress } from "../../lib/format";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import { BanIcon, HandsIcon, ShieldIcon, WalletIcon } from "../ui/Icons";

/*
 * Konten tiap bab landing page. Animasi dibaca dari CSS variable yang diisi FlowStory per frame:
 *   --p  (0..1 selama section melintasi layar) dan --ps (0..1 selama bagian sticky menempel).
 * `scrub(start, end, variable)` menghasilkan ekspresi CSS 0..1 antara dua titik progres.
 */
export const scrub = (start, end, variable = "--ps") => `clamp(0, (var(${variable}) - ${start}) / ${end - start}, 1)`;

export const Eyebrow = ({ children }) => (
  <p className="l-accent flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.3em] sm:text-xs">
    <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--l-neon)" }} />
    {children}
  </p>
);

const StepEyebrow = ({ number }) => {
  const { t } = useI18n();
  return (
    <Eyebrow>
      {t("landing.journeyEyebrow")} · 0{number}/04
    </Eyebrow>
  );
};

// ---------------------------------------------------------------------------
// 01 · Dompet — tata letak cermin, angka raksasa bergeser, status koneksi berganti
// ---------------------------------------------------------------------------

export const WalletChapter = () => {
  const { t } = useI18n();
  const connected = scrub(0.4, 0.5, "--p");

  return (
    <div className="relative grid items-center gap-10 lg:grid-cols-2">
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -top-[18vh] right-0 select-none font-mono text-[clamp(12rem,34vw,30rem)] font-bold leading-none"
        style={{
          color: "transparent",
          WebkitTextStroke: "1px var(--l-line)",
          transform: "translate3d(calc((var(--p) - 0.5) * -45vw), 0, 0)",
        }}
      >
        01
      </p>
      <div className="hidden lg:block" />
      <div className="relative">
        <StepEyebrow number={1} />
        <h2 className="mt-5 text-[clamp(2.75rem,6.5vw,5.5rem)] font-extrabold leading-[0.95] tracking-tighter">
          {t("landing.step1Title")}
        </h2>
        <p className="l-muted mt-5 max-w-md text-base sm:text-lg">{t("landing.step1Text")}</p>

        <div className="l-line l-raised mt-8 inline-flex items-center gap-4 rounded-2xl border p-2 pr-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: "var(--l-neon-soft)" }}
          >
            <WalletIcon className="l-accent h-6 w-6" />
          </span>
          <span className="min-w-0">
            <span className="block font-mono text-sm font-bold">
              {shortAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")}
            </span>
            <span className="relative block h-5 text-xs font-semibold">
              <span
                className="l-muted absolute inset-0 flex items-center gap-1.5"
                style={{ opacity: `calc(1 - ${connected})` }}
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                {t("landing.walletConnecting")}
              </span>
              <span className="l-accent absolute inset-0 flex items-center gap-1.5" style={{ opacity: connected }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--l-neon)" }} />
                {t("landing.walletConnected")} ✓
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 02 · Buat kampanye — form yang terisi sendiri mengikuti scroll, lalu terbit jadi kartu
// ---------------------------------------------------------------------------

const BuilderField = ({ label, children, show }) => (
  <div style={{ opacity: `calc(0.25 + ${show} * 0.75)`, transform: `translate3d(calc((1 - ${show}) * 24px), 0, 0)` }}>
    <p className="l-muted text-[11px] font-semibold uppercase tracking-widest">{label}</p>
    <div className="mt-1.5">{children}</div>
  </div>
);

export const CampaignBuilderChapter = () => {
  const { t } = useI18n();
  const title = t("landing.builderTitle");
  const titleTyped = scrub(0.04, 0.26);
  const category = scrub(0.26, 0.36);
  const goal = scrub(0.36, 0.54);
  const deadline = scrub(0.54, 0.64);
  const publish = scrub(0.7, 0.86);
  const categories = ["Pendidikan", "Kesehatan", "Lingkungan"];

  return (
    <div className="l-pin sticky top-0 flex h-screen items-center overflow-hidden pt-16">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8">
        <div>
          <StepEyebrow number={2} />
          <h2 className="mt-3 text-[clamp(2rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-tighter sm:mt-5">
            {t("landing.step2Title")}
          </h2>
          <p className="l-muted mt-3 max-w-md text-sm sm:mt-5 sm:text-lg">{t("landing.step2Text")}</p>
          <ol className="mt-8 hidden space-y-3 text-sm font-semibold lg:block">
            {[
              [t("form.title"), titleTyped],
              [t("form.category"), category],
              [t("form.goal"), goal],
              [t("form.deadline"), deadline],
            ].map(([label, value]) => (
              <li key={label} className="flex items-center gap-3">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[11px] font-black"
                  style={{
                    borderColor: "var(--l-neon)",
                    background: `color-mix(in srgb, var(--l-neon) calc(${value} * 100%), transparent)`,
                    color: "var(--l-paper)",
                  }}
                >
                  ✓
                </span>
                <span style={{ opacity: `calc(0.45 + ${value} * 0.55)` }}>{label}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative mx-auto w-full max-w-[20rem] sm:max-w-lg">
          {/* Form yang terisi */}
          <div
            className="l-line l-raised relative rounded-[2rem] border p-5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.55)] sm:p-8"
            style={{
              transform: `perspective(1400px) rotateY(calc(${publish} * -14deg)) translate3d(calc(${publish} * -12%), calc(${publish} * 4%), 0) scale(calc(1 - ${publish} * 0.12))`,
              opacity: `calc(1 - ${publish} * 0.55)`,
            }}
          >
            <p className="flex items-center justify-between text-sm font-bold">
              {t("form.modalTitle")}
              <span className="l-muted font-mono text-xs">{t("landing.builderDraft")}</span>
            </p>
            <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-5">
              <BuilderField label={t("form.title")} show={titleTyped}>
                <div className="l-line rounded-xl border px-4 py-3 text-base font-semibold">
                  <span
                    className="inline-block max-w-full overflow-hidden whitespace-nowrap align-bottom"
                    style={{ width: `calc(${titleTyped} * ${title.length + 1}ch)` }}
                  >
                    {title}
                  </span>
                  <span
                    className="l-caret ml-0.5 inline-block h-5 w-0.5 align-middle"
                    style={{ background: "var(--l-neon)" }}
                  />
                </div>
              </BuilderField>

              <BuilderField label={t("form.category")} show={category}>
                <div className="flex flex-wrap gap-2">
                  {categories.map((item, index) => (
                    <span
                      key={item}
                      className="l-line rounded-full border px-3 py-1.5 text-xs font-bold"
                      style={
                        index === 0
                          ? {
                              background: `color-mix(in srgb, var(--l-neon) calc(${category} * 100%), transparent)`,
                              color: `color-mix(in srgb, var(--l-paper) calc(${category} * 100%), var(--l-ink))`,
                              borderColor: "var(--l-neon)",
                            }
                          : undefined
                      }
                    >
                      {t(`category.${item}`)}
                    </span>
                  ))}
                  <span className="l-muted rounded-full px-2 py-1.5 text-xs font-semibold">
                    📍 {t("province.Nusa Tenggara Timur")}
                  </span>
                </div>
              </BuilderField>

              <BuilderField label={t("form.goal")} show={goal}>
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-3xl font-bold tabular-nums">
                    <span className="relative inline-block h-[1.2em] w-[2ch] overflow-hidden align-bottom">
                      <span
                        className="absolute inset-x-0 top-0"
                        style={{ transform: `translate3d(0, calc(${goal} * -10 * 1.2em), 0)` }}
                      >
                        {Array.from({ length: 11 }, (_, n) => (
                          <span key={n} className="block h-[1.2em] text-right leading-[1.2em]">
                            {n}
                          </span>
                        ))}
                      </span>
                    </span>{" "}
                    ETH
                  </p>
                  <p className="l-muted text-xs">{t("landing.builderMin")}</p>
                </div>
                <div className="relative mt-3 h-2 rounded-full" style={{ background: "var(--l-line)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `calc(${goal} * 100%)`,
                      background: "linear-gradient(90deg, var(--l-neon), var(--l-violet))",
                    }}
                  />
                  <span
                    className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 shadow"
                    style={{ left: `calc(${goal} * 100%)`, borderColor: "var(--l-neon)", background: "var(--l-paper)" }}
                  />
                </div>
              </BuilderField>

              <BuilderField label={t("form.deadline")} show={deadline}>
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[11px]">
                  {Array.from({ length: 14 }, (_, index) => {
                    const picked = index === 12;
                    return (
                      <span
                        key={index}
                        className="rounded-md py-1.5"
                        style={
                          picked
                            ? {
                                background: `color-mix(in srgb, var(--l-violet) calc(${deadline} * 100%), var(--l-line))`,
                                color: `color-mix(in srgb, #fff calc(${deadline} * 100%), var(--l-ink))`,
                                fontWeight: 700,
                                transform: `scale(calc(1 + ${deadline} * 0.15))`,
                              }
                            : { background: "var(--l-line)" }
                        }
                      >
                        {index + 17}
                      </span>
                    );
                  })}
                </div>
              </BuilderField>
            </div>
            <div
              className="mt-6 flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold"
              style={{
                background: "var(--l-ink)",
                color: "var(--l-paper)",
                boxShadow: `0 0 0 calc(${deadline} * 6px) var(--l-neon-soft)`,
              }}
            >
              {t("form.submit")} →
            </div>
          </div>

          {/* Kartu kampanye yang terbit */}
          <div
            className="l-line l-raised absolute bottom-[12%] right-0 w-[82%] overflow-hidden rounded-3xl border shadow-[0_40px_100px_-30px_rgba(0,0,0,0.6)] sm:-right-8"
            style={{
              opacity: publish,
              transform: `translate3d(calc((1 - ${publish}) * 30%), calc((1 - ${publish}) * 20%), 0) rotate(calc((1 - ${publish}) * 8deg + 3deg)) scale(calc(0.85 + ${publish} * 0.15))`,
            }}
            aria-hidden="true"
          >
            <div className="relative h-28 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600">
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                {t("landing.slideLive")}
              </span>
              <HandsIcon className="absolute -bottom-6 -right-4 h-24 w-24 text-white/25" />
            </div>
            <div className="p-4">
              <p className="l-accent text-[10px] font-bold uppercase tracking-widest">{t("category.Pendidikan")}</p>
              <p className="mt-1 truncate font-extrabold">{title}</p>
              <div className="mt-3 h-1.5 rounded-full" style={{ background: "var(--l-line)" }}>
                <div className="h-full w-[8%] rounded-full" style={{ background: "var(--l-neon)" }} />
              </div>
              <p className="l-muted mt-2 flex justify-between text-xs">
                <span>0 / 10 ETH</span>
                <span className="l-accent font-bold">✓ {t("landing.builderPublished")}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 03 · Donasi — lintasan horizontal kartu bukti donasi (aksen emas)
// ---------------------------------------------------------------------------

const Receipt = ({ donation, index }) => {
  const { t } = useI18n();
  const { label } = useIdentity([donation.contributor]);
  return (
    <li
      className="l-line l-raised relative flex w-[16rem] shrink-0 flex-col rounded-3xl border p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.6)] sm:w-[21rem]"
      style={{ transform: `rotate(${index % 2 ? 2 : -2}deg)` }}
    >
      <p className="l-muted truncate font-mono text-[10px] uppercase tracking-[0.15em] sm:text-[11px] sm:tracking-[0.25em]">
        {t("landing.receiptLabel")}
      </p>
      <p className="mt-3 font-mono text-4xl font-bold tracking-tight sm:text-5xl" style={{ color: "var(--l-gold)" }}>
        +{formatEth(donation.amount)}
      </p>
      <p className="mt-4 line-clamp-3 min-h-[4.5em] text-sm leading-relaxed sm:text-base">
        {donation.message ? (
          `“${donation.message}”`
        ) : (
          <span className="l-muted italic">{t("landing.receiptNoMessage")}</span>
        )}
      </p>
      {/* Perforasi tiket */}
      <div className="relative my-5">
        <div className="l-line border-t border-dashed" />
        <span className="absolute -left-9 -top-3 h-6 w-6 rounded-full" style={{ background: "var(--l-paper)" }} />
        <span className="absolute -right-9 -top-3 h-6 w-6 rounded-full" style={{ background: "var(--l-paper)" }} />
      </div>
      <p className="truncate text-sm font-bold">{donation.campaignTitle}</p>
      <p className="l-muted mt-1 flex justify-between gap-3 text-xs">
        <span className="truncate">{label(donation.contributor)}</span>
        <span className="shrink-0">{formatShortDate(donation.time, true)}</span>
      </p>
    </li>
  );
};

export const DonationTrackChapter = ({ donations }) => {
  const { t } = useI18n();
  const items = donations || [];

  return (
    <div
      className="l-pin sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16"
      style={{ "--l-neon": "var(--l-gold)", "--l-accent": "var(--l-gold)" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-between gap-4 px-4 sm:px-6 lg:flex-row lg:items-end lg:px-8">
        <div>
          <StepEyebrow number={3} />
          <h2 className="mt-4 text-[clamp(2.5rem,6vw,5rem)] font-extrabold leading-[0.95] tracking-tighter">
            {t("landing.step3Title")}
          </h2>
        </div>
        <p className="l-muted max-w-sm text-sm sm:text-base">
          {t("landing.step3Text")}{" "}
          {donations && (
            <span className="l-accent font-semibold">{t("landing.donationCount", { count: items.length })}</span>
          )}
        </p>
      </div>

      <ol
        className="l-track mt-10 flex w-max items-center gap-5 py-6 pl-[max(1rem,calc((100vw-80rem)/2+2rem))] pr-[8vw] sm:gap-8"
        style={{ transform: "translate3d(calc(var(--ps) * (-100% + 100vw)), 0, 0)" }}
      >
        {items.map((donation, index) => (
          <Receipt key={donation.txHash} donation={donation} index={index} />
        ))}
        <li
          className="flex w-[16rem] shrink-0 flex-col items-start justify-center rounded-3xl border-2 border-dashed p-6 sm:w-[21rem]"
          style={{ borderColor: "var(--l-gold)" }}
        >
          <p className="text-2xl font-extrabold leading-tight">
            {items.length ? t("landing.receiptNext") : t("landing.receiptEmpty")}
          </p>
          <Link href="/dashboard" className="l-btn-primary mt-5">
            {t("landing.receiptNextCta")} →
          </Link>
        </li>
      </ol>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 04 · Voting — odometer, donatur menyala satu per satu, meter 50%+1, stempel
// ---------------------------------------------------------------------------

const Stamp = ({ className, stamp }) => {
  const { t } = useI18n();
  return (
    <span
      className={`whitespace-nowrap rounded-xl border-4 px-3 py-1 text-[clamp(0.9rem,2.6vw,1.75rem)] font-black uppercase tracking-widest ${className}`}
      style={{
        color: "var(--l-accent)",
        borderColor: "var(--l-accent)",
        background: "color-mix(in srgb, var(--l-paper) 80%, transparent)",
        opacity: stamp,
        transform: `rotate(-12deg) scale(calc(2 - ${stamp}))`,
      }}
    >
      {t("landing.voteStamp")}
    </span>
  );
};

export const VoteChapter = () => {
  const { t } = useI18n();
  const count = scrub(0.12, 0.62);
  const stamp = scrub(0.7, 0.8);

  return (
    <div className="l-pin sticky top-0 flex h-screen items-center overflow-hidden pt-16">
      <div className="mx-auto w-full max-w-5xl px-4 text-center sm:px-6">
        <div className="flex justify-center">
          <StepEyebrow number={4} />
        </div>
        <h2 className="mt-4 text-[clamp(2rem,4.5vw,3.75rem)] font-extrabold leading-none tracking-tighter">
          {t("landing.step4Title")}
        </h2>

        <div className="relative mx-auto mt-6 inline-flex items-end font-mono font-bold leading-none tracking-tighter">
          <span className="inline-block h-[1.15em] overflow-hidden text-[clamp(5rem,17vw,12rem)]">
            <span className="block" style={{ transform: `translate3d(0, calc(${count} * -6.9em), 0)` }}>
              {Array.from({ length: 7 }, (_, digit) => (
                <span key={digit} className="block h-[1.15em] leading-[1.15em]">
                  {digit}
                </span>
              ))}
            </span>
          </span>
          <span className="l-muted pb-[0.12em] text-[clamp(2rem,6vw,4.5rem)]">/10</span>

          <Stamp className="absolute -right-52 top-0 hidden sm:block" stamp={stamp} />
        </div>
        <p className="l-muted mt-2 text-sm font-semibold uppercase tracking-widest">{t("landing.voteApprovals")}</p>
        <Stamp className="relative mx-auto mt-4 inline-block sm:hidden" stamp={stamp} />

        <ol className="mx-auto mt-8 flex max-w-xl justify-center gap-2 sm:gap-3" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => {
            const approves = index < 6;
            const lit = scrub(0.12 + index * 0.083, 0.12 + index * 0.083 + 0.05);
            return (
              <li
                key={index}
                className="l-line flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black sm:h-11 sm:w-11 sm:text-sm"
                style={
                  approves
                    ? {
                        background: `color-mix(in srgb, var(--l-neon) calc(${lit} * 100%), transparent)`,
                        borderColor: "var(--l-neon)",
                        color: "var(--l-paper)",
                        transform: `scale(calc(0.8 + ${lit} * 0.2))`,
                      }
                    : { opacity: 0.5 }
                }
              >
                {approves ? "✓" : "·"}
              </li>
            );
          })}
        </ol>

        <div className="relative mx-auto mt-8 h-3 max-w-xl rounded-full" style={{ background: "var(--l-line)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `calc(${count} * 60%)`,
              background: "linear-gradient(90deg, var(--l-neon), var(--l-violet))",
            }}
          />
          <span className="absolute -top-2 left-1/2 h-7 w-0.5" style={{ background: "var(--l-ink)" }} />
          <span className="absolute left-1/2 top-7 -translate-x-1/2 whitespace-nowrap font-mono text-xs font-bold">
            50%+1
          </span>
        </div>
        <p className="l-muted mx-auto mt-12 max-w-md text-sm sm:text-base">{t("landing.step4Text")}</p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Statistik — pita warna terbalik dengan teks raksasa yang bergeser berlawanan arah
// ---------------------------------------------------------------------------

const StatNumber = ({ value, decimals = 0, suffix, label, start }) => {
  const current = useCountUp(value ?? 0, start && value !== null);
  return (
    <div className="l-line border-t pt-4">
      <p className="whitespace-nowrap font-mono text-[clamp(2.25rem,4.6vw,4.25rem)] font-bold leading-none tabular-nums tracking-tight">
        {value === null
          ? "—"
          : formatNumber(current, { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
        {value !== null && suffix && <span className="l-accent ml-1.5 text-base sm:text-xl">{suffix}</span>}
      </p>
      <p className="l-muted mt-3 text-[11px] font-semibold uppercase tracking-widest sm:text-xs">{label}</p>
    </div>
  );
};

export const StatsChapter = ({ stats, start }) => {
  const { t } = useI18n();
  const ticker = Array.from({ length: 6 }, () => t("landing.statsTicker")).join("  ✦  ");

  return (
    <div
      className="relative -mx-2 overflow-hidden rounded-[2.5rem] px-6 py-16 sm:mx-0 sm:px-12 sm:py-24"
      style={{
        background: "var(--l-ink)",
        color: "var(--l-paper)",
        transform: `scale(calc(0.88 + ${scrub(0.05, 0.4, "--p")} * 0.12))`,
      }}
    >
      <div
        style={{
          "--l-muted": "color-mix(in srgb, var(--l-paper) 62%, transparent)",
          "--l-line": "color-mix(in srgb, var(--l-paper) 18%, transparent)",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-6 select-none space-y-2 opacity-[0.14]"
        >
          <p
            className="whitespace-nowrap text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-none"
            style={{ transform: "translate3d(calc(var(--p) * -40%), 0, 0)" }}
          >
            {ticker}
          </p>
          <p
            className="whitespace-nowrap text-[clamp(3rem,9vw,7rem)] font-black uppercase leading-none"
            style={{
              transform: "translate3d(calc(-50% + var(--p) * 40%), 0, 0)",
              color: "transparent",
              WebkitTextStroke: "1.5px var(--l-paper)",
            }}
          >
            {ticker}
          </p>
        </div>

        <div className="relative pt-28 sm:pt-40">
          <Eyebrow>{t("landing.statsEyebrow")}</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-[clamp(2.25rem,6vw,5rem)] font-extrabold leading-[0.98] tracking-tighter">
            {t("landing.statsTitle")}
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-6 sm:gap-10 lg:grid-cols-4">
            <StatNumber label={t("dashboard.statTotal")} value={stats.total} start={start} />
            <StatNumber
              label={t("dashboard.statRaised")}
              value={stats.raised}
              decimals={1}
              suffix="ETH"
              start={start}
            />
            <StatNumber label={t("dashboard.statActive")} value={stats.active} start={start} />
            <StatNumber label={t("landing.statVoting")} value={stats.voting} start={start} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Fitur — kartu bertumpuk (sticky), tiap kartu punya gaya berbeda
// ---------------------------------------------------------------------------

const EVENT_LOG = [
  ["FundingReceived", "+4.5 ETH"],
  ["WithdrawRequestCreated", "#1"],
  ["WithdrawRequestApproved", "6/10"],
  ["WithdrawCompleted", "1.0 ETH"],
];

export const FeatureStackChapter = () => {
  const { t } = useI18n();
  const cards = [
    {
      title: t("landing.feature1Title"),
      text: t("landing.feature1Text"),
      style: { background: "var(--l-paper-raised)" },
      className: "l-line border",
      art: (
        <div className="l-line w-full overflow-hidden rounded-2xl border font-mono text-xs sm:text-sm">
          {EVENT_LOG.map(([event, value], index) => (
            <div key={event} className={`l-line flex justify-between gap-4 px-4 py-3 ${index ? "border-t" : ""}`}>
              <span className="truncate">{event}</span>
              <span className="l-accent font-bold">{value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: t("landing.feature2Title"),
      text: t("landing.feature2Text", { days: VOTING_PERIOD_DAYS, quorum: QUORUM_PERCENT }),
      style: {
        background: "var(--l-ink)",
        color: "var(--l-paper)",
        "--l-muted": "color-mix(in srgb, var(--l-paper) 65%, transparent)",
      },
      art: (
        <p
          className="font-mono text-[clamp(4rem,10vw,8rem)] font-bold leading-none tracking-tighter"
          style={{ color: "var(--l-neon)" }}
        >
          50%+1
        </p>
      ),
    },
    {
      title: t("landing.feature3Title"),
      text: t("landing.feature3Text"),
      style: {
        background: "linear-gradient(135deg, #34d399, #0d9488)",
        color: "#04130d",
        "--l-muted": "rgba(4, 19, 13, 0.72)",
      },
      art: <WalletIcon className="h-40 w-40 opacity-80 sm:h-56 sm:w-56" />,
    },
    {
      title: t("landing.feature4Title"),
      text: t("landing.feature4Text", { days: ABANDON_PERIOD_DAYS }),
      style: { background: "var(--l-paper)", borderColor: "var(--l-gold)" },
      className: "border-2",
      art: (
        <p
          className="font-mono text-[clamp(6rem,14vw,11rem)] font-bold leading-none"
          style={{ color: "var(--l-gold)" }}
        >
          ↺
        </p>
      ),
    },
    {
      title: t("landing.feature5Title"),
      text: t("landing.feature5Text"),
      style: {
        background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
        color: "#f5f3ff",
        "--l-muted": "rgba(245, 243, 255, 0.75)",
      },
      art: (
        <div className="flex gap-4 opacity-90">
          <ShieldIcon className="h-24 w-24 sm:h-36 sm:w-36" />
          <BanIcon className="h-24 w-24 sm:h-36 sm:w-36" />
        </div>
      ),
    },
  ];

  return (
    <div className="py-10">
      <Eyebrow>{t("landing.bentoEyebrow")}</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-[clamp(2.25rem,5.5vw,4.75rem)] font-extrabold leading-[0.98] tracking-tighter">
        {t("landing.bentoTitle")}
      </h2>
      <ol className="mt-12 space-y-[10vh] pb-[6vh]">
        {cards.map((card, index) => (
          <li
            key={card.title}
            className={`l-pin sticky grid min-h-[56vh] items-center gap-8 overflow-hidden rounded-[2.5rem] p-8 shadow-[0_-30px_80px_-40px_rgba(0,0,0,0.45)] sm:p-12 md:grid-cols-[1fr_auto] ${card.className || ""}`}
            style={{ top: `calc(5.5rem + ${index} * 1.4rem)`, ...card.style }}
          >
            <div>
              <p className="font-mono text-sm font-bold opacity-70">0{index + 1} / 05</p>
              <h3 className="mt-4 text-[clamp(2rem,4.5vw,3.75rem)] font-extrabold leading-none tracking-tighter">
                {card.title}
              </h3>
              <p className="l-muted mt-5 max-w-lg text-base sm:text-lg">{card.text}</p>
            </div>
            <div className="hidden justify-self-end md:flex">{card.art}</div>
          </li>
        ))}
      </ol>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Penutup — portal lingkaran yang membesar & judul yang menyusut (aksen rose)
// ---------------------------------------------------------------------------

export const CtaChapter = ({ onStart, isConnecting }) => {
  const { t } = useI18n();
  const open = scrub(0.12, 0.5, "--p");

  return (
    <div
      className="relative flex min-h-[80vh] items-center justify-center text-center"
      style={{ "--l-neon": "var(--l-rose)", "--l-accent": "var(--l-rose)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(110vw,70rem)] rounded-full border"
        style={{
          borderColor: "color-mix(in srgb, var(--l-rose) 45%, transparent)",
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--l-rose) 16%, transparent), color-mix(in srgb, var(--l-violet) 8%, transparent) 55%, transparent 70%)",
          transform: `translate(-50%, -50%) scale(calc(0.15 + ${open} * 0.85))`,
          opacity: `calc(0.3 + ${open} * 0.7)`,
        }}
      />
      <div className="relative">
        <HandsIcon className="l-accent mx-auto h-10 w-10" />
        <h2
          className="mt-6 text-[clamp(3rem,9vw,8rem)] font-extrabold leading-[0.92] tracking-tighter"
          style={{ transform: `scale(calc(1.35 - ${open} * 0.35))`, opacity: `calc(0.2 + ${open} * 0.8)` }}
        >
          {t("landing.ctaTitle")}
        </h2>
        <p className="l-muted mx-auto mt-6 max-w-xl text-base sm:text-lg">{t("landing.ctaText")}</p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button className="l-btn-primary px-9 py-4 text-base" onClick={onStart} disabled={isConnecting}>
            {isConnecting ? t("wallet.connecting") : t("landing.ctaButton")} <span aria-hidden="true">→</span>
          </button>
          <Link href="/stats" className="l-btn-ghost px-7 py-4 text-base">
            {t("nav.stats")}
          </Link>
        </div>
      </div>
    </div>
  );
};
