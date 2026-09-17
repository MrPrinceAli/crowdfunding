// Preferensi tampilan yang disimpan di browser: bahasa & tema

export const LOCALES = ["id", "en"];
export const THEMES = ["system", "light", "dark"];

const LOCALE_KEY = "himpun-locale";
const THEME_KEY = "himpun-theme";

const read = (key, allowed, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // mode privat / storage diblokir: preferensi hanya berlaku di sesi ini
  }
};

export const readLocale = () => read(LOCALE_KEY, LOCALES, "id");
export const saveLocale = (locale) => write(LOCALE_KEY, locale);
export const readTheme = () => read(THEME_KEY, THEMES, "system");
export const saveTheme = (theme) => write(THEME_KEY, theme);

export const prefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;

/** Terapkan tema ke <html>; "system" mengikuti pengaturan perangkat */
export const applyTheme = (theme) => {
  const dark = theme === "dark" || (theme === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
  return dark;
};

/**
 * Script inline di <head> agar tema diterapkan sebelum halaman tampil (tanpa kedipan terang).
 * Harus sinkron dengan THEME_KEY & applyTheme di atas.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"system";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");var l=localStorage.getItem("${LOCALE_KEY}");if(l==="en")document.documentElement.lang="en";}catch(e){}})();`;
