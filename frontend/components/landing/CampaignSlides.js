import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useReducedMotion } from "../../hooks/useScrollMotion";
import { daysLeft, isBeforeDeadline } from "../../lib/campaign";
import { formatEth, nowInSeconds } from "../../lib/format";
import { selectCampaigns } from "../../store/campaigns";
import CampaignCover from "../campaign/CampaignCover";
import { useI18n } from "../providers/PreferencesProvider";
import { MapPinIcon } from "../ui/Icons";
import VerifiedBadge from "../ui/VerifiedBadge";

export const SLIDE_DURATION_MS = 5000;
const MAX_SLIDES = 6;

/** Kampanye yang masih menerima donasi, yang terbaru dulu */
export const runningCampaigns = (campaigns, now = nowInSeconds()) =>
  (campaigns || [])
    .filter(
      (campaign) =>
        !campaign.isTakenDown &&
        !campaign.isCancelled &&
        campaign.state !== "Expired" &&
        isBeforeDeadline(campaign.deadline, now),
    )
    .reverse()
    .slice(0, MAX_SLIDES);

/** Posisi kartu di tumpukan berdasarkan jarak dari kartu aktif */
const deckStyle = (relative, total) => {
  if (relative === 0) return { transform: "translate3d(0,0,0) rotate(0deg) scale(1)", opacity: 1, zIndex: 30 };
  if (relative === total - 1 && total > 2) {
    // Kartu yang baru saja lewat terlempar ke kiri
    return { transform: "translate3d(-115%, 8%, 0) rotate(-14deg) scale(0.9)", opacity: 0, zIndex: 40 };
  }
  if (relative <= 2) {
    return {
      transform: `translate3d(${relative * 26}px, ${-relative * 20}px, 0) rotate(${relative * 4}deg) scale(${1 - relative * 0.06})`,
      opacity: relative === 1 ? 0.75 : 0.4,
      zIndex: 30 - relative,
    };
  }
  return { transform: "translate3d(60px,-50px,0) rotate(10deg) scale(0.82)", opacity: 0, zIndex: 0 };
};

const Slide = ({ campaign, isActive, style }) => {
  const { t } = useI18n();
  const progress = Math.min(campaign.progress, 100);
  const remainingDays = daysLeft(campaign.deadline);

  return (
    <Link
      href={`/project-details/${campaign.address}`}
      tabIndex={isActive ? 0 : -1}
      aria-hidden={!isActive}
      className="l-line l-raised absolute inset-0 flex flex-col overflow-hidden rounded-[2rem] border shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)] transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.2,0.7,0.1,1)] will-change-transform"
      style={style}
    >
      <CampaignCover
        address={campaign.address}
        imageUrl={campaign.imageUrl}
        className={`h-[62%] min-h-0 sm:h-[58%] flex-shrink-0 [&_img]:duration-[7000ms] [&_img]:ease-linear ${
          isActive ? "[&_img]:scale-110" : ""
        }`}
        iconClassName="-bottom-10 -right-8 h-56 w-56"
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute left-4 right-4 top-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            {t("landing.slideLive")}
          </span>
          {campaign.isVerified && (
            <span className="rounded-full bg-white/90 backdrop-blur">
              <VerifiedBadge />
            </span>
          )}
        </div>
        <div className="absolute inset-x-5 bottom-4 text-white">
          <p className="flex flex-wrap items-center gap-x-3 text-xs font-semibold uppercase tracking-wider text-white/80">
            {t(`category.${campaign.category}`)}
            {campaign.location && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal">
                <MapPinIcon className="h-3.5 w-3.5" />
                {t(`province.${campaign.location}`)}
              </span>
            )}
          </p>
          <h3 className="mt-1 line-clamp-2 text-xl font-extrabold leading-tight sm:text-2xl">{campaign.title}</h3>
        </div>
      </CampaignCover>

      <div className="flex flex-1 flex-col justify-between gap-3 p-5">
        <p className="l-muted line-clamp-2 hidden text-sm sm:block">{campaign.description}</p>
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--l-line)" }}>
            <div
              className="h-full rounded-full transition-[width] duration-1000"
              style={{
                width: isActive ? `${progress}%` : "0%",
                background: "linear-gradient(90deg, var(--l-neon), var(--l-violet))",
              }}
            />
          </div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold">{formatEth(campaign.raisedAmount)}</p>
              <p className="l-muted truncate text-xs">
                {t("campaign.raisedOf", { goal: formatEth(campaign.goalAmount) })}
              </p>
            </div>
            <div className="text-right">
              <p className="l-accent text-lg font-extrabold">{campaign.progress}%</p>
              <p className="l-muted text-xs">{t("campaign.daysLeft", { days: remainingDays })}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

/**
 * Carousel otomatis kampanye yang sedang berjalan, bergaya tumpukan kartu.
 * Slide berganti saat animasi indikator (SLIDE_DURATION_MS) selesai, jadi jeda indikator = jeda slide.
 * Berhenti saat kursor/fokus di atasnya, saat `paused`, atau jika pengguna memilih "kurangi animasi".
 */
const CampaignSlides = ({ paused = false }) => {
  const { t } = useI18n();
  const campaigns = useSelector(selectCampaigns);
  const reducedMotion = useReducedMotion();
  const slides = useMemo(() => runningCampaigns(campaigns), [campaigns]);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const total = slides.length;
  const isPlaying = total > 1 && !paused && !hovered && !userPaused && !reducedMotion;

  useEffect(() => {
    if (active >= total) setActive(0);
  }, [active, total]);

  const go = useCallback((step) => setActive((current) => (total ? (current + step + total) % total : 0)), [total]);

  if (!campaigns) {
    return <div className="l-line l-raised aspect-[5/4] w-full animate-pulse rounded-[2rem] border sm:aspect-square" />;
  }

  if (total === 0) {
    return (
      <div className="l-line l-raised flex aspect-[5/4] w-full flex-col sm:aspect-square items-center justify-center rounded-[2rem] border p-8 text-center">
        <p className="text-2xl font-extrabold">{t("landing.slideEmptyTitle")}</p>
        <p className="l-muted mt-2 text-sm">{t("landing.slideEmptyText")}</p>
        <Link href="/dashboard" className="l-btn-primary mt-6">
          {t("dashboard.create")}
        </Link>
      </div>
    );
  }

  const current = slides[Math.min(active, total - 1)];

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("landing.slidesLabel")}
    >
      {/* Indikator durasi tiap slide */}
      <div className="mb-4 flex gap-1.5" aria-hidden="true">
        {slides.map((slide, index) => (
          <span
            key={slide.address}
            className="h-1 flex-1 overflow-hidden rounded-full"
            style={{ background: "var(--l-line)" }}
          >
            <span
              key={index === active ? `${slide.address}-${active}` : slide.address}
              className="block h-full origin-left rounded-full"
              style={{
                background: "var(--l-neon)",
                transform: index < active ? "scaleX(1)" : "scaleX(0)",
                animation:
                  index === active && total > 1 && !reducedMotion
                    ? `l-story ${SLIDE_DURATION_MS}ms linear forwards`
                    : undefined,
                animationPlayState: isPlaying ? "running" : "paused",
              }}
              onAnimationEnd={index === active ? () => go(1) : undefined}
            />
          </span>
        ))}
      </div>

      <div className="relative aspect-[5/4] w-full sm:aspect-square">
        {slides.map((campaign, index) => {
          const relative = (index - active + total) % total;
          return (
            <Slide
              key={campaign.address}
              campaign={campaign}
              isActive={relative === 0}
              style={deckStyle(relative, total)}
            />
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="l-muted font-mono text-xs" aria-live="polite">
          {t("landing.slideOf", { current: active + 1, total })}
          <span className="sr-only"> · {current.title}</span>
        </p>
        {total > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="l-btn-ghost h-10 w-10 p-0"
              onClick={() => go(-1)}
              aria-label={t("landing.slidePrev")}
            >
              ←
            </button>
            <button
              type="button"
              className="l-btn-ghost h-10 w-10 p-0 text-xs"
              onClick={() => setUserPaused(!userPaused)}
              aria-label={userPaused ? t("landing.slidePlay") : t("landing.slidePause")}
              aria-pressed={userPaused}
            >
              {userPaused ? "▶" : "❚❚"}
            </button>
            <button
              type="button"
              className="l-btn-ghost h-10 w-10 p-0"
              onClick={() => go(1)}
              aria-label={t("landing.slideNext")}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignSlides;
