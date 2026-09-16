import { REMINDER_DAYS } from "./campaign";
import { loadActivity, loadMyContributions } from "./contracts";
import { nowInSeconds, sameAddress } from "./format";

export const NOTIFICATION_LIMIT = 30;
const SEEN_KEY = "crowdfunding-notifications-seen";
const DISMISSED_KEY = "crowdfunding-reminders-dismissed";

/**
 * Jenis aktivitas yang dikirim sebagai notifikasi, per peran akun terhadap kampanye:
 * - owner: kampanye milik akun
 * - donor: kampanye yang pernah didukung akun
 * - favorite: kampanye favorit (disimpan di browser)
 */
export const TYPES_BY_ROLE = {
  owner: [
    "donation",
    "approved",
    "rejected",
    "reported",
    "verified",
    "unverified",
    "takenDown",
    "appealAccepted",
    "appealRejected",
  ],
  donor: ["withdrawRequested", "withdrawn", "update", "edited", "extended", "closed", "campaignCancelled", "takenDown"],
  favorite: ["update", "extended", "closed", "campaignCancelled", "takenDown"],
};

/** Peran terkuat dipakai jika akun punya lebih dari satu hubungan dengan kampanye */
const roleFor = (campaign, account, donatedSet, favoriteSet) => {
  const key = campaign.address.toLowerCase();
  if (sameAddress(campaign.creator, account)) return "owner";
  if (donatedSet.has(key)) return "donor";
  if (favoriteSet.has(key)) return "favorite";
  return null;
};

/** Ubah aktivitas kampanye menjadi notifikasi untuk satu akun (tanpa aksi akun itu sendiri) */
export const activityToNotifications = (activity, campaign, role, account) =>
  activity
    .filter((item) => TYPES_BY_ROLE[role].includes(item.type) && !sameAddress(item.actor, account))
    .map((item) => ({
      ...item,
      role,
      campaignAddress: campaign.address,
      campaignTitle: campaign.title,
    }));

/**
 * Pengingat kampanye favorit yang masih menerima donasi dan berakhir dalam REMINDER_DAYS hari.
 * Tidak berasal dari event, jadi status dibacanya disimpan per kampanye (lihat dismissReminders).
 */
export const buildReminders = ({ account, campaigns, favorites = [], now = nowInSeconds() }) => {
  const favoriteSet = new Set(favorites.map((address) => address.toLowerCase()));
  return (campaigns || [])
    .filter(
      (campaign) =>
        favoriteSet.has(campaign.address.toLowerCase()) &&
        !sameAddress(campaign.creator, account) &&
        !campaign.isCancelled &&
        campaign.deadline > now &&
        campaign.deadline - now <= REMINDER_DAYS * 86400,
    )
    .sort((a, b) => a.deadline - b.deadline)
    .map((campaign) => ({
      // Deadline ikut di id: jika deadline diperpanjang lalu mendekat lagi, pengingat muncul kembali
      id: `ending-${campaign.address.toLowerCase()}-${campaign.deadline}`,
      type: "endingSoon",
      campaignAddress: campaign.address,
      campaignTitle: campaign.title,
      deadline: campaign.deadline,
    }));
};

/** Notifikasi terbaru untuk akun, dari semua kampanye yang terkait dengannya */
export const loadNotifications = async ({ account, campaigns, favorites = [] }) => {
  if (!account || !campaigns) return [];
  const donated = await loadMyContributions(account);
  const donatedSet = new Set(donated.map((item) => item.campaignAddress.toLowerCase()));
  const favoriteSet = new Set(favorites.map((address) => address.toLowerCase()));

  const related = campaigns
    .map((campaign) => ({ campaign, role: roleFor(campaign, account, donatedSet, favoriteSet) }))
    .filter((entry) => entry.role);

  const perCampaign = await Promise.all(
    related.map(async ({ campaign, role }) =>
      activityToNotifications(await loadActivity(campaign.address), campaign, role, account),
    ),
  );
  return perCampaign
    .flat()
    .sort((a, b) => b.order - a.order)
    .slice(0, NOTIFICATION_LIMIT);
};

const seenKey = (account) => `${SEEN_KEY}:${account.toLowerCase()}`;

/** Urutan (blok & index event) notifikasi terakhir yang sudah dibaca; 0 = belum pernah */
export const readSeenOrder = (account) => {
  try {
    return Number(localStorage.getItem(seenKey(account))) || 0;
  } catch {
    return 0;
  }
};

const dismissedKey = (account) => `${DISMISSED_KEY}:${account.toLowerCase()}`;

/** Id pengingat yang sudah dibaca */
export const readDismissedReminders = (account) => {
  try {
    const value = JSON.parse(localStorage.getItem(dismissedKey(account)));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const dismissReminders = (account, ids) => {
  const next = [...new Set([...readDismissedReminders(account), ...ids])].slice(-100);
  try {
    localStorage.setItem(dismissedKey(account), JSON.stringify(next));
  } catch {
    // storage diblokir: status dibaca hanya berlaku sampai halaman dimuat ulang
  }
  return next;
};

export const saveSeenOrder = (account, order) => {
  try {
    localStorage.setItem(seenKey(account), String(order));
  } catch {
    // storage diblokir: status dibaca hanya berlaku sampai halaman dimuat ulang
  }
};
