import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { setCurrentLocale, translate } from "../../lib/i18n";
import { applyTheme, readLocale, readTheme, saveLocale, saveTheme } from "../../lib/preferences";

const PreferencesContext = createContext(null);

/** Menyediakan bahasa (ID/EN) & tema (system/light/dark) untuk seluruh aplikasi */
export const PreferencesProvider = ({ children }) => {
  // Render awal selalu "id" agar sama dengan HTML hasil build; preferensi tersimpan dibaca setelah mount
  const [locale, setLocaleState] = useState("id");
  const [theme, setThemeState] = useState("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedLocale = readLocale();
    setCurrentLocale(savedLocale);
    setLocaleState(savedLocale);
    setThemeState(readTheme());
  }, []);

  useEffect(() => {
    setCurrentLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    setIsDark(applyTheme(theme));
    if (theme !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setIsDark(applyTheme("system"));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setLocale = useCallback((next) => {
    setCurrentLocale(next);
    saveLocale(next);
    setLocaleState(next);
  }, []);

  const setTheme = useCallback((next) => {
    saveTheme(next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      isDark,
      t: (key, vars) => translate(key, vars, locale),
    }),
    [locale, setLocale, theme, setTheme, isDark],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  // Fallback untuk komponen yang dirender tanpa provider (mis. di unit test)
  return (
    context || {
      locale: "id",
      setLocale: () => {},
      theme: "system",
      setTheme: () => {},
      isDark: false,
      t: (key, vars) => translate(key, vars, "id"),
    }
  );
};

/** Singkatan: const { t } = useI18n() */
export const useI18n = usePreferences;
