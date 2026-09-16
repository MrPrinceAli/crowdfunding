import { ComputerIcon, MoonIcon, SunIcon } from "../ui/Icons";
import { useI18n } from "../providers/PreferencesProvider";

const THEME_ICONS = { system: ComputerIcon, light: SunIcon, dark: MoonIcon };
const NEXT_THEME = { system: "light", light: "dark", dark: "system" };

/** Tombol ganti bahasa (ID/EN) dan tema (sistem → terang → gelap) */
const PreferenceControls = () => {
  const { t, locale, setLocale, theme, setTheme } = useI18n();
  const ThemeIcon = THEME_ICONS[theme];

  return (
    <div className="flex items-center gap-1">
      <div className="tab-list p-0.5" role="group" aria-label={t("preferences.language")}>
        {["id", "en"].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={locale === code}
            className={`tab px-2.5 py-1 text-xs uppercase ${locale === code ? "tab-active" : ""}`}
          >
            {code}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTheme(NEXT_THEME[theme])}
        className="text-muted rounded-lg p-2 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        title={t("preferences.themeCurrent", { theme: t(`preferences.theme.${theme}`) })}
        aria-label={t("preferences.themeCurrent", { theme: t(`preferences.theme.${theme}`) })}
      >
        <ThemeIcon className="h-5 w-5" />
      </button>
    </div>
  );
};

export default PreferenceControls;
