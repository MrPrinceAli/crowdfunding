import { useI18n } from "../../providers/PreferencesProvider";
import { scrub, StepEyebrow } from "./shared";

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

const VoteChapter = () => {
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

export default VoteChapter;
