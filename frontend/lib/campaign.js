import { nowInSeconds } from "./format";

// Harus sama dengan enum & konstanta di smart-contract/contracts/Project.sol
export const CAMPAIGN_STATE = ["Fundraising", "Expired", "Successful"];
export const REQUEST_STATUS = ["Voting", "Approved", "Rejected", "Completed", "Cancelled"];
export const VOTE = { None: 0, Approve: 1, Reject: 2 };
export const VOTING_PERIOD_DAYS = 3;
export const QUORUM_PERCENT = 20;

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

export const isBeforeDeadline = (deadline, now = nowInSeconds()) => now < deadline;

export const daysLeft = (deadline, now = nowInSeconds()) => Math.max(0, Math.floor((deadline - now) / 86400));

export const campaignStatus = (campaign, now = nowInSeconds()) => {
  if (campaign.state === "Successful") {
    return { key: "successful", label: "Berhasil", className: "bg-emerald-100 text-emerald-700" };
  }
  if (campaign.state === "Expired" || !isBeforeDeadline(campaign.deadline, now)) {
    return { key: "ended", label: "Berakhir", className: "bg-rose-100 text-rose-700" };
  }
  return { key: "active", label: "Aktif", className: "bg-sky-100 text-sky-700" };
};

/** Jumlah suara setuju agar langsung disetujui (50%+1 dari semua donatur) */
export const majorityVotes = (contributorCount) => Math.floor(contributorCount / 2) + 1;

/** Jumlah pemilih minimum agar hasil voting setelah batas waktu sah */
export const quorumVotes = (contributorCount) => Math.max(1, Math.ceil((contributorCount * QUORUM_PERCENT) / 100));

/**
 * Status permintaan penarikan beserta alasannya. Logika sama dengan Project.getRequestStatus().
 * Status resmi tetap dibaca dari contract; fungsi ini untuk teks penjelasan & fallback.
 */
export const evaluateWithdrawRequest = (request, contributorCount, now = nowInSeconds()) => {
  if (request.isCompleted) return { status: "Completed" };
  if (request.isCancelled) return { status: "Cancelled" };

  const approvals = Number(request.approvalCount);
  const rejections = Number(request.rejectionCount);

  if (approvals * 2 > contributorCount) return { status: "Approved", reason: "Disetujui mayoritas donatur" };
  if (rejections * 2 > contributorCount) return { status: "Rejected", reason: "Ditolak mayoritas donatur" };
  if (now < request.votingDeadline) return { status: "Voting" };

  const participants = approvals + rejections;
  const quorumReached = participants > 0 && participants * 100 >= contributorCount * QUORUM_PERCENT;
  if (!quorumReached) {
    return { status: "Rejected", reason: `Voting selesai, kuorum ${QUORUM_PERCENT}% donatur tidak tercapai` };
  }
  if (approvals > rejections) return { status: "Approved", reason: "Voting selesai, suara setuju lebih banyak" };
  return { status: "Rejected", reason: "Voting selesai, suara setuju tidak lebih banyak dari tolak" };
};
