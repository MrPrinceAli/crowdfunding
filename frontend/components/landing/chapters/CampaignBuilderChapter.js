import { useI18n } from "../../providers/PreferencesProvider";
import { HandsIcon } from "../../ui/Icons";
import { scrub, StepEyebrow } from "./shared";

// ---------------------------------------------------------------------------
// 02 · Buat kampanye — form yang terisi sendiri mengikuti scroll, lalu terbit jadi kartu
// ---------------------------------------------------------------------------

const BuilderField = ({ label, children, show }) => (
  <div style={{ opacity: `calc(0.25 + ${show} * 0.75)`, transform: `translate3d(calc((1 - ${show}) * 24px), 0, 0)` }}>
    <p className="l-muted text-[11px] font-semibold uppercase tracking-widest">{label}</p>
    <div className="mt-1.5">{children}</div>
  </div>
);

const CampaignBuilderChapter = () => {
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

export default CampaignBuilderChapter;
