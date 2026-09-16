import Link from "next/link";
import { formatEth, formatShortDate } from "../../../lib/format";
import { useIdentity } from "../../providers/IdentityProvider";
import { useI18n } from "../../providers/PreferencesProvider";
import { scrub, StepEyebrow } from "./shared";

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

const DonationTrackChapter = ({ donations }) => {
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

export default DonationTrackChapter;
