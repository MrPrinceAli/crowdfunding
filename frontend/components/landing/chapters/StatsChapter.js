import { useCountUp } from "../../../hooks/useScrollMotion";
import { formatNumber } from "../../../lib/format";
import { useI18n } from "../../providers/PreferencesProvider";
import { Eyebrow, scrub } from "./shared";

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

const StatsChapter = ({ stats, start }) => {
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

export default StatsChapter;
