import { shortAddress } from "../../../lib/format";
import { useI18n } from "../../providers/PreferencesProvider";
import { WalletIcon } from "../../ui/Icons";
import { scrub, StepEyebrow } from "./shared";

// ---------------------------------------------------------------------------
// 01 · Dompet — tata letak cermin, angka raksasa bergeser, status koneksi berganti
// ---------------------------------------------------------------------------

const WalletChapter = () => {
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

export default WalletChapter;
