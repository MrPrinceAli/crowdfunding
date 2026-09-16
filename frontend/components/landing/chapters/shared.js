import { useI18n } from "../../providers/PreferencesProvider";

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

export const StepEyebrow = ({ number }) => {
  const { t } = useI18n();
  return (
    <Eyebrow>
      {t("landing.journeyEyebrow")} · 0{number}/04
    </Eyebrow>
  );
};
