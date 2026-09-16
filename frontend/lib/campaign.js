import RULES from "./abi/rules.json";
import { nowInSeconds } from "./format";

// Urutan enum harus sama dengan Project.sol; angka aturan di-generate dari Solidity
// ke lib/abi/rules.json oleh `npm run compile` (lihat smart-contract/scripts/export-abi.js)
export const CAMPAIGN_STATE = ["Fundraising", "Expired", "Successful"];
export const REQUEST_STATUS = ["Voting", "Approved", "Rejected", "Completed", "Cancelled"];
export const VOTE = { None: 0, Approve: 1, Reject: 2 };

const DAY = 86400;

export const VOTING_PERIOD_DAYS = RULES.VOTING_PERIOD / DAY;
export const QUORUM_PERCENT = RULES.QUORUM_PERCENT;
export const ABANDON_PERIOD_DAYS = RULES.ABANDON_PERIOD / DAY;
export const MAX_EXTENSION_DAYS = RULES.MAX_EXTENSION / DAY;
export const APPEAL_PERIOD_DAYS = RULES.APPEAL_PERIOD / DAY;
export const MAX_MESSAGE_LENGTH = RULES.MAX_MESSAGE_LENGTH;
export const MAX_TITLE_LENGTH = RULES.MAX_TITLE_LENGTH;
export const MAX_TEXT_LENGTH = RULES.MAX_TEXT_LENGTH;
export const MAX_URL_LENGTH = RULES.MAX_URL_LENGTH;
export const MAX_NAME_BYTES = RULES.MAX_NAME_LENGTH;

/** Nilai kategori yang disimpan di contract (tetap Bahasa Indonesia); label tampilan lewat t("category.<nilai>") */
export const CATEGORIES = ["Pendidikan", "Kesehatan", "Bencana Alam", "Lingkungan", "Sosial", "Lainnya"];

/**
 * Lokasi kampanye = provinsi (disimpan di contract dalam Bahasa Indonesia; label lewat t("province.<nilai>")).
 * 38 provinsi Indonesia, ditambah kampanye nasional/online dan luar negeri.
 */
export const PROVINCES = [
  "Nasional",
  "Aceh",
  "Sumatera Utara",
  "Sumatera Barat",
  "Riau",
  "Kepulauan Riau",
  "Jambi",
  "Bengkulu",
  "Sumatera Selatan",
  "Kepulauan Bangka Belitung",
  "Lampung",
  "Banten",
  "DKI Jakarta",
  "Jawa Barat",
  "Jawa Tengah",
  "DI Yogyakarta",
  "Jawa Timur",
  "Bali",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Kalimantan Barat",
  "Kalimantan Tengah",
  "Kalimantan Selatan",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Sulawesi Utara",
  "Gorontalo",
  "Sulawesi Tengah",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tenggara",
  "Maluku",
  "Maluku Utara",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Tengah",
  "Papua Pegunungan",
  "Papua Selatan",
  "Luar Negeri",
];

/** Harus sama dengan enum AppealStatus di Crowdfunding.sol */
export const APPEAL_STATUS = ["None", "Pending", "Accepted", "Rejected"];

/** Pengingat untuk kampanye favorit yang akan berakhir dalam sekian hari */
export const REMINDER_DAYS = 3;

export const SORT_OPTIONS = ["newest", "ending", "raised", "progress"];

export const PAGE_SIZE = 9;

const COVER_GRADIENTS = [
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-amber-300 via-orange-400 to-rose-500",
  "from-sky-400 via-indigo-500 to-violet-600",
  "from-pink-400 via-rose-500 to-red-500",
  "from-lime-300 via-emerald-400 to-teal-600",
  "from-fuchsia-400 via-purple-500 to-indigo-600",
];

/** Warna cover yang konsisten per alamat */
export const coverGradient = (address = "") => {
  const hash = address.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COVER_GRADIENTS[hash % COVER_GRADIENTS.length];
};

/** Batas akhir pengajuan banding (detik); 0 jika kampanye tidak di-takedown */
export const appealDeadline = (campaign) =>
  campaign.takenDownAt ? campaign.takenDownAt + APPEAL_PERIOD_DAYS * DAY : 0;

export const isBeforeDeadline = (deadline, now = nowInSeconds()) => now < deadline;

export const daysLeft = (deadline, now = nowInSeconds()) => Math.max(0, Math.floor((deadline - now) / DAY));

export const campaignStatus = (campaign, now = nowInSeconds()) => {
  if (campaign.isTakenDown) return { key: "takenDown", className: "badge-rose" };
  if (campaign.isCancelled) return { key: "cancelled", className: "badge-slate" };
  if (campaign.state === "Successful") return { key: "successful", className: "badge-emerald" };
  if (campaign.state === "Expired" || !isBeforeDeadline(campaign.deadline, now)) {
    return { key: "ended", className: "badge-rose" };
  }
  return { key: "active", className: "badge-sky" };
};

/** Urutkan kampanye tanpa mengubah array aslinya; urutan asli = urutan dibuat */
export const sortCampaigns = (campaigns, sortKey, now = nowInSeconds()) => {
  const list = [...campaigns];
  switch (sortKey) {
    case "ending": {
      // Kampanye aktif dengan deadline terdekat dulu, yang sudah berakhir di belakang
      const rank = (campaign) => (isBeforeDeadline(campaign.deadline, now) ? campaign.deadline : Infinity);
      return list.sort((a, b) => rank(a) - rank(b));
    }
    case "raised":
      return list.sort((a, b) => b.raisedAmount - a.raisedAmount);
    case "progress":
      return list.sort((a, b) => b.progress - a.progress);
    case "newest":
    default:
      return list.reverse();
  }
};

export const paginate = (items, page, pageSize = PAGE_SIZE) => {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  return { items: items.slice((current - 1) * pageSize, current * pageSize), page: current, pageCount };
};

/** Jumlah suara setuju agar langsung disetujui (50%+1 dari pemilih yang berhak) */
export const majorityVotes = (voterCount) => Math.floor(voterCount / 2) + 1;

/** Jumlah pemilih minimum agar hasil voting setelah batas waktu sah */
export const quorumVotes = (voterCount) => Math.max(1, Math.ceil((voterCount * QUORUM_PERCENT) / 100));

/**
 * Status permintaan penarikan beserta kunci alasannya (terjemahan: t("withdraw.reason.<kunci>")). Logika sama dengan Project.getRequestStatus():
 * dihitung dari `eligibleVoterCount` (donatur saat permintaan dibuat).
 * Status resmi tetap dibaca dari contract; fungsi ini untuk teks penjelasan & fallback.
 */
export const evaluateWithdrawRequest = (request, now = nowInSeconds()) => {
  if (request.isCompleted) return { status: "Completed" };
  if (request.isCancelled) return { status: "Cancelled" };

  const voters = Number(request.eligibleVoterCount);
  const approvals = Number(request.approvalCount);
  const rejections = Number(request.rejectionCount);

  if (approvals * 2 > voters) return { status: "Approved", reason: "majorityApproved" };
  if (rejections * 2 > voters) return { status: "Rejected", reason: "majorityRejected" };
  if (now < request.votingDeadline) return { status: "Voting" };

  const participants = approvals + rejections;
  const quorumReached = participants > 0 && participants * 100 >= voters * QUORUM_PERCENT;
  if (!quorumReached) return { status: "Rejected", reason: "quorumNotReached" };
  if (approvals > rejections) return { status: "Approved", reason: "moreApprovals" };
  return { status: "Rejected", reason: "notMoreApprovals" };
};
