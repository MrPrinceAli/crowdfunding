import en from "./en";
import id from "./id";

export const DICTIONARIES = { id, en };

// Bahasa aktif untuk kode di luar komponen React (format angka, pesan error)
let currentLocale = "id";

export const setCurrentLocale = (locale) => {
  currentLocale = DICTIONARIES[locale] ? locale : "id";
};

export const getCurrentLocale = () => currentLocale;

/** Locale Intl untuk format angka & tanggal */
export const intlLocale = (locale = currentLocale) => (locale === "en" ? "en-US" : "id-ID");

/**
 * Terjemahkan kunci, mis. t("donation.minimum", { amount: "0,1 ETH" }).
 * Jika kunci tidak ada di bahasa aktif, pakai Bahasa Indonesia; jika tetap tidak ada, kembalikan kuncinya.
 * Bentuk tunggal: jika `count` = 1 dan ada kunci "<kunci>.one" (mis. di bahasa Inggris), kunci itu yang dipakai.
 */
export const translate = (key, vars = {}, locale = currentLocale) => {
  const singular = Number(vars.count) === 1 ? DICTIONARIES[locale]?.[`${key}.one`] : undefined;
  const template = singular ?? DICTIONARIES[locale]?.[key] ?? DICTIONARIES.id[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
};
