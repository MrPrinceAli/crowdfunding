import { formatEther, parseEther } from "ethers";
import { intlLocale, translate } from "./i18n";

/** wei (bigint/string) -> jumlah ETH (number) */
export const weiToEther = (wei) => Number(formatEther(wei ?? 0n));

/** jumlah ETH (string/number) -> wei (bigint) */
export const etherToWei = (ether) => parseEther(String(ether));

export const nowInSeconds = () => Math.floor(Date.now() / 1000);

export const formatNumber = (value, options) => Number(value || 0).toLocaleString(intlLocale(), options);

export const formatEth = (value) => `${formatNumber(value, { maximumFractionDigits: 4 })} ETH`;

/** UNIX timestamp (detik) -> "DD/MM/YYYY" */
export const formatDate = (seconds) => {
  const date = new Date(Number(seconds) * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

/** UNIX timestamp (detik) -> "15 Sep" / "15 Sep 2026" sesuai bahasa aktif */
export const formatShortDate = (seconds, withYear = false) =>
  new Date(Number(seconds) * 1000).toLocaleDateString(intlLocale(), {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });

/** UNIX timestamp (detik) -> tanggal & jam, untuk riwayat aktivitas */
export const formatDateTime = (seconds) =>
  new Date(Number(seconds) * 1000).toLocaleString(intlLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Sisa waktu sampai timestamp (detik), mis. "2 hari 3 jam" / "2 days 3 hours" */
export const formatTimeLeft = (targetSeconds, now = nowInSeconds()) => {
  const diff = Math.max(0, targetSeconds - now);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return translate("time.daysHours", { days, hours });
  if (hours > 0) return translate("time.hoursMinutes", { hours, minutes });
  return translate("time.minutes", { minutes: Math.max(1, minutes) });
};

export const shortAddress = (address = "") => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

export const sameAddress = (a, b) => Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
