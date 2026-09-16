import Link from "next/link";
import { useI18n } from "../../providers/PreferencesProvider";
import { HandsIcon } from "../../ui/Icons";
import { scrub } from "./shared";

// ---------------------------------------------------------------------------
// Penutup — portal lingkaran yang membesar & judul yang menyusut (aksen rose)
// ---------------------------------------------------------------------------

const CtaChapter = ({ onStart, isConnecting }) => {
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

export default CtaChapter;
