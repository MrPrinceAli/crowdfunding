import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import CrowdfundingAbi from "./abi/Crowdfunding.json";
import ProjectAbi from "./abi/Project.json";
import { APPEAL_STATUS, CAMPAIGN_STATE, REQUEST_STATUS } from "./campaign";
import { CHAIN_ID, CROWDFUNDING_ADDRESS, IS_LOCAL_CHAIN, RPC_URL } from "./config";
import { etherToWei, weiToEther } from "./format";
import { translate } from "./i18n";

// ---------------------------------------------------------------------------
// Koneksi
// ---------------------------------------------------------------------------

let readProvider;

/**
 * Provider untuk membaca data langsung dari RPC. Tidak bergantung pada MetaMask,
 * sehingga kampanye tetap tampil walaupun dompet belum terhubung atau berada di jaringan lain.
 */
export const getReadProvider = () => {
  if (!readProvider) {
    readProvider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true, pollingInterval: 2000 });
  }
  return readProvider;
};

/** Signer untuk mengirim transaksi: MetaMask, atau akun Hardhat yang tidak terkunci di mode dev lokal */
export const getSigner = async (account) => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new BrowserProvider(window.ethereum).getSigner(account);
  }
  if (IS_LOCAL_CHAIN) return getReadProvider().getSigner(account);
  throw new Error(translate("wallet.notFound"));
};

/** Akun Hardhat yang tidak terkunci (hanya untuk mode dev tanpa MetaMask) */
export const getDevAccounts = () => getReadProvider().send("eth_accounts", []);

const crowdfunding = (runner = getReadProvider()) => new Contract(CROWDFUNDING_ADDRESS, CrowdfundingAbi, runner);

const project = (address, runner = getReadProvider()) => new Contract(address, ProjectAbi, runner);

/** Kirim transaksi dan tunggu sampai masuk blok */
const send = async (txPromise) => (await txPromise).wait();

const blockTimestamp = async (blockNumber) => (await getReadProvider().getBlock(blockNumber)).timestamp;

/** Timestamp untuk banyak event sekaligus (satu permintaan per blok) */
const blockTimestamps = async (events) => {
  const blocks = [...new Set(events.map((event) => event.blockNumber))];
  const times = await Promise.all(blocks.map(blockTimestamp));
  return new Map(blocks.map((block, index) => [block, times[index]]));
};

// ---------------------------------------------------------------------------
// Kampanye
// ---------------------------------------------------------------------------

export const getAdminAddress = () => crowdfunding().owner();

/** Ringkasan penarikan dana: sudah ditarik & jumlah voting aktif */
const loadWithdrawSummary = async (contract, count) => {
  const requests = await Promise.all(
    Array.from({ length: count }, (_, id) =>
      Promise.all([contract.withdrawRequests(id), contract.getRequestStatus(id)]),
    ),
  );
  return {
    withdrawnAmount: requests.reduce(
      (sum, [request]) => sum + (request.isCompleted ? weiToEther(request.amount) : 0),
      0,
    ),
    activeVotingCount: requests.filter(([, status]) => REQUEST_STATUS[Number(status)] === "Voting").length,
  };
};

export const loadCampaign = async (address) => {
  const contract = project(address);
  const registry = crowdfunding();
  const [
    details,
    category,
    imageUrl,
    location,
    requestCount,
    pending,
    contributorCount,
    updateCount,
    abandonedAt,
    abandoned,
    deadlineExtended,
    closedEarly,
    isCancelled,
    cancelledByAdmin,
    refundOpen,
  ] = await Promise.all([
    contract.getProjectDetails(),
    contract.category(),
    contract.imageUrl(),
    contract.location(),
    contract.withdrawRequestCount(),
    contract.pendingWithdrawAmount(),
    contract.contributorCount(),
    contract.updateCount(),
    contract.abandonedAt(),
    contract.isAbandoned(),
    contract.deadlineExtended(),
    contract.closedEarly(),
    contract.isCancelled(),
    contract.cancelledByAdmin(),
    contract.isRefundOpen(),
  ]);
  const [isVerified, reportCount, isTakenDown, takenDownAt, appealStatus, summary] = await Promise.all([
    registry.isVerified(address),
    registry.reportCount(address),
    registry.isTakenDown(address),
    registry.takenDownAt(address),
    registry.appealStatus(address),
    loadWithdrawSummary(contract, Number(requestCount)),
  ]);

  const raisedAmount = weiToEther(details.currentAmount);
  const goalAmount = weiToEther(details.goalAmount);

  return {
    address,
    creator: details.projectCreator,
    title: details.title,
    description: details.description,
    category,
    imageUrl,
    location,
    minContribution: weiToEther(details.minContribution),
    goalAmount,
    raisedAmount,
    balance: weiToEther(details.balance),
    state: CAMPAIGN_STATE[Number(details.currentState)],
    deadline: Number(details.projectDeadline),
    progress: goalAmount > 0 ? Math.round((raisedAmount / goalAmount) * 100) : 0,
    pendingWithdrawAmount: weiToEther(pending),
    contributorCount: Number(contributorCount),
    updateCount: Number(updateCount),
    abandonedAt: Number(abandonedAt),
    isAbandoned: abandoned,
    deadlineExtended,
    closedEarly,
    isCancelled,
    cancelledByAdmin,
    isTakenDown,
    takenDownAt: Number(takenDownAt),
    appealStatus: APPEAL_STATUS[Number(appealStatus)],
    isRefundOpen: refundOpen,
    isVerified,
    reportCount: Number(reportCount),
    ...summary,
  };
};

export const loadCampaigns = async () => {
  const addresses = await crowdfunding().getAllProjects();
  return Promise.all(addresses.map((address) => loadCampaign(address)));
};

/** @returns alamat contract kampanye baru */
export const createCampaign = async (signer, form) => {
  const registry = crowdfunding(signer);
  const receipt = await send(
    registry.createProject(
      etherToWei(form.minContribution),
      form.deadline,
      etherToWei(form.goalAmount),
      form.title,
      form.description,
      form.category,
      form.imageUrl,
      form.location,
    ),
  );
  const event = receipt.logs
    .map((log) => registry.interface.parseLog(log))
    .find((parsed) => parsed?.name === "ProjectCreated");
  return event.args.projectAddress;
};

export const contribute = (signer, campaignAddress, amountEth, message = "") =>
  send(crowdfunding(signer).contribute(campaignAddress, message, { value: etherToWei(amountEth) }));

/** Semua donasi ke kampanye, urut dari yang terlama (dengan waktu & pesan dukungan) */
export const loadDonations = async (campaignAddress) => {
  const contract = project(campaignAddress);
  const events = await contract.queryFilter(contract.filters.FundingReceived(), 0);
  const times = await blockTimestamps(events);
  return events.map((event) => ({
    contributor: event.args.contributor,
    amount: weiToEther(event.args.amount),
    message: event.args.message,
    time: times.get(event.blockNumber),
    txHash: event.transactionHash,
  }));
};

export const editCampaign = (signer, campaignAddress, { description, category, imageUrl, location }) =>
  send(project(campaignAddress, signer).editCampaign(description, category, imageUrl, location));

export const extendDeadline = (signer, campaignAddress, newDeadline) =>
  send(project(campaignAddress, signer).extendDeadline(newDeadline));

export const closeFunding = (signer, campaignAddress) => send(project(campaignAddress, signer).closeFunding());

export const cancelCampaign = (signer, campaignAddress, reason) =>
  send(project(campaignAddress, signer).cancelProject(reason));

export const takedownCampaign = (signer, campaignAddress, reason) =>
  send(crowdfunding(signer).takedownProject(campaignAddress, reason));

export const appealTakedown = (signer, campaignAddress, reason) =>
  send(crowdfunding(signer).appealTakedown(campaignAddress, reason));

export const resolveAppeal = (signer, campaignAddress, accepted, note) =>
  send(crowdfunding(signer).resolveAppeal(campaignAddress, accepted, note));

/** Isi banding & keputusan admin: { reason, appealedAt, accepted, note, resolvedAt } (null jika belum ada) */
export const loadAppeal = async (campaignAddress) => {
  const registry = crowdfunding();
  const [appeals, resolutions] = await Promise.all([
    registry.queryFilter(registry.filters.TakedownAppealed(campaignAddress), 0),
    registry.queryFilter(registry.filters.AppealResolved(campaignAddress), 0),
  ]);
  if (appeals.length === 0) return null;
  const times = await blockTimestamps([...appeals, ...resolutions]);
  const [appeal] = appeals;
  const [resolution] = resolutions;
  return {
    reason: appeal.args.reason,
    appealedAt: times.get(appeal.blockNumber),
    accepted: resolution ? resolution.args.accepted : null,
    note: resolution ? resolution.args.note : null,
    resolvedAt: resolution ? times.get(resolution.blockNumber) : null,
  };
};

/** Alasan & waktu pembatalan kampanye (null jika tidak dibatalkan) */
export const loadCancellation = async (campaignAddress) => {
  const contract = project(campaignAddress);
  const [event] = await contract.queryFilter(contract.filters.ProjectCancelled(), 0);
  if (!event) return null;
  return {
    byAdmin: event.args.byAdmin,
    reason: event.args.reason,
    cancelledAt: Number(event.args.cancelledAt),
    txHash: event.transactionHash,
  };
};

/** Riwayat donasi sebuah akun ke semua kampanye */
export const loadMyContributions = async (account) => {
  const registry = crowdfunding();
  const events = await registry.queryFilter(registry.filters.ContributionReceived(null, null, account), 0);
  return events.map(({ args }) => ({
    campaignAddress: args.projectAddress,
    amount: weiToEther(args.amount),
    message: args.message,
  }));
};

/** Data kampanye yang khusus untuk akun tertentu */
export const loadAccountCampaignInfo = async (campaignAddress, account) => {
  const contract = project(campaignAddress);
  const [contributed, refundable, refundClaimed, hasReported] = await Promise.all([
    contract.contributions(account),
    contract.refundableAmount(account),
    contract.refundClaimed(account),
    crowdfunding().hasReported(campaignAddress, account),
  ]);
  return {
    contributed: weiToEther(contributed),
    refundable: weiToEther(refundable),
    refundClaimed,
    hasReported,
  };
};

/** Tarik kembali bagian sisa dana (kampanye dibatalkan atau dana terbengkalai) */
export const claimRefund = (signer, campaignAddress) => send(project(campaignAddress, signer).claimRefund());

// ---------------------------------------------------------------------------
// Kabar, laporan & verifikasi
// ---------------------------------------------------------------------------

export const loadUpdates = async (campaignAddress) => {
  const contract = project(campaignAddress);
  const events = await contract.queryFilter(contract.filters.ProjectUpdatePosted(), 0);
  return events
    .map((event) => ({
      id: Number(event.args.updateId),
      message: event.args.message,
      postedAt: Number(event.args.postedAt),
      txHash: event.transactionHash,
    }))
    .reverse();
};

export const postUpdate = (signer, campaignAddress, message) =>
  send(project(campaignAddress, signer).postUpdate(message));

export const loadReports = async (campaignAddress) => {
  const registry = crowdfunding();
  const events = await registry.queryFilter(registry.filters.ProjectReported(campaignAddress), 0);
  return Promise.all(
    events.map(async (event) => ({
      reporter: event.args.reporter,
      reason: event.args.reason,
      reportedAt: await blockTimestamp(event.blockNumber),
    })),
  ).then((reports) => reports.reverse());
};

export const reportCampaign = (signer, campaignAddress, reason) =>
  send(crowdfunding(signer).reportProject(campaignAddress, reason));

export const setCampaignVerified = (signer, campaignAddress, verified) =>
  send(crowdfunding(signer).setVerified(campaignAddress, verified));

// ---------------------------------------------------------------------------
// Profil
// ---------------------------------------------------------------------------

/** Nama tampilan semua pengguna: Map alamat (huruf kecil) -> nama; nama kosong = dihapus */
export const loadDisplayNames = async () => {
  const registry = crowdfunding();
  const events = await registry.queryFilter(registry.filters.DisplayNameChanged(), 0);
  const names = new Map();
  events.forEach(({ args }) => {
    const key = args.account.toLowerCase();
    if (args.name) names.set(key, args.name);
    else names.delete(key);
  });
  return names;
};

export const setDisplayName = (signer, name) => send(crowdfunding(signer).setDisplayName(name));

// ---------------------------------------------------------------------------
// Permintaan penarikan dana
// ---------------------------------------------------------------------------

const toWithdrawRequest = (id, request, status) => ({
  id,
  description: request.description,
  amount: weiToEther(request.amount),
  recipient: request.recipient,
  approvalCount: Number(request.approvalCount),
  rejectionCount: Number(request.rejectionCount),
  votingDeadline: Number(request.votingDeadline),
  eligibleVoterCount: Number(request.eligibleVoterCount),
  isCompleted: request.isCompleted,
  isCancelled: request.isCancelled,
  status: REQUEST_STATUS[Number(status)],
});

export const loadWithdrawRequests = async (campaignAddress) => {
  const contract = project(campaignAddress);
  const count = Number(await contract.withdrawRequestCount());
  if (count === 0) return [];

  // Bukti transaksi (hash & waktu) untuk penarikan yang sudah selesai
  const completedEvents = await contract.queryFilter(contract.filters.WithdrawCompleted(), 0);
  const proofs = {};
  await Promise.all(
    completedEvents.map(async (event) => {
      proofs[Number(event.args.requestId)] = {
        txHash: event.transactionHash,
        completedAt: await blockTimestamp(event.blockNumber),
      };
    }),
  );

  return Promise.all(
    Array.from({ length: count }, async (_, id) => {
      const [request, status] = await Promise.all([contract.withdrawRequests(id), contract.getRequestStatus(id)]);
      return { ...toWithdrawRequest(id, request, status), ...proofs[id] };
    }),
  );
};

export const createWithdrawRequest = (signer, campaignAddress, { description, amount, recipient }) =>
  send(project(campaignAddress, signer).createWithdrawRequest(description, etherToWei(amount), recipient));

const sendRequestAction = (method) => (signer, campaignAddress, requestId) =>
  send(project(campaignAddress, signer)[method](requestId));

export const approveWithdrawRequest = sendRequestAction("approveWithdrawRequest");
export const rejectWithdrawRequest = sendRequestAction("rejectWithdrawRequest");
export const cancelWithdrawRequest = sendRequestAction("cancelWithdrawRequest");
export const executeWithdrawRequest = sendRequestAction("executeWithdrawRequest");

/** Suara akun (0 = belum, 1 = setuju, 2 = tolak) & apakah akun berhak voting pada permintaan ini */
export const loadVoterInfo = async (campaignAddress, requestId, account) => {
  const contract = project(campaignAddress);
  const [vote, canVote] = await Promise.all([
    contract.getVote(requestId, account),
    contract.canVote(requestId, account),
  ]);
  return { vote: Number(vote), canVote };
};

/** Permintaan yang sedang voting, berhak dipilih, dan belum dipilih oleh akun */
export const loadPendingVotes = async (account, campaignAddresses) => {
  const perCampaign = await Promise.all(
    campaignAddresses.map(async (campaignAddress) => {
      const contract = project(campaignAddress);
      const count = Number(await contract.withdrawRequestCount());

      const requests = await Promise.all(
        Array.from({ length: count }, async (_, id) => {
          const [status, vote, canVote] = await Promise.all([
            contract.getRequestStatus(id),
            contract.getVote(id, account),
            contract.canVote(id, account),
          ]);
          if (REQUEST_STATUS[Number(status)] !== "Voting" || Number(vote) !== 0 || !canVote) return null;
          return { campaignAddress, ...toWithdrawRequest(id, await contract.withdrawRequests(id), status) };
        }),
      );
      return requests.filter(Boolean);
    }),
  );
  return perCampaign.flat().sort((a, b) => a.votingDeadline - b.votingDeadline);
};

// ---------------------------------------------------------------------------
// Riwayat aktivitas & statistik
// ---------------------------------------------------------------------------

/**
 * Semua kejadian penting sebuah kampanye dalam satu timeline (terbaru dulu).
 * type: created | donation | edited | extended | closed | campaignCancelled | takenDown | appealed |
 *       appealAccepted | appealRejected | update |
 *       withdrawRequested | approved | rejected | cancelled | withdrawn | refund | reported | verified | unverified
 * Item "edited" berisi `changes`: [{ field, before, after }] dibanding versi sebelumnya.
 */
const EDITABLE_FIELDS = ["description", "category", "location", "imageUrl"];

/** Setiap edit dibandingkan dengan versi sebelumnya (awal = data saat kampanye dibuat) */
const editHistory = (createdEvent, editEvents) => {
  let previous = createdEvent
    ? Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, createdEvent.args[field]]))
    : null;
  return [...editEvents]
    .sort((a, b) => a.blockNumber - b.blockNumber || a.index - b.index)
    .map((event) => {
      const next = Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, event.args[field]]));
      const changes = EDITABLE_FIELDS.filter((field) => !previous || previous[field] !== next[field]).map((field) => ({
        field,
        before: previous ? previous[field] : null,
        after: next[field],
      }));
      previous = next;
      return { event, type: "edited", changes };
    });
};

export const loadActivity = async (campaignAddress) => {
  const contract = project(campaignAddress);
  const registry = crowdfunding();
  const query = (target, filter) => target.queryFilter(filter, 0);

  const [
    created,
    donations,
    edits,
    extensions,
    updates,
    requests,
    approvals,
    rejections,
    cancels,
    withdrawals,
    refunds,
    reports,
    verifications,
    closings,
    cancellations,
    appeals,
    appealResolutions,
  ] = await Promise.all([
    query(registry, registry.filters.ProjectCreated(campaignAddress)),
    query(contract, contract.filters.FundingReceived()),
    query(contract, contract.filters.CampaignEdited()),
    query(contract, contract.filters.DeadlineExtended()),
    query(contract, contract.filters.ProjectUpdatePosted()),
    query(contract, contract.filters.WithdrawRequestCreated()),
    query(contract, contract.filters.WithdrawRequestApproved()),
    query(contract, contract.filters.WithdrawRequestRejected()),
    query(contract, contract.filters.WithdrawRequestCancelled()),
    query(contract, contract.filters.WithdrawCompleted()),
    query(contract, contract.filters.RefundClaimed()),
    query(registry, registry.filters.ProjectReported(campaignAddress)),
    query(registry, registry.filters.ProjectVerified(campaignAddress)),
    query(contract, contract.filters.FundingClosed()),
    query(contract, contract.filters.ProjectCancelled()),
    query(registry, registry.filters.TakedownAppealed(campaignAddress)),
    query(registry, registry.filters.AppealResolved(campaignAddress)),
  ]);

  const items = [
    ...created.map((event) => ({ event, type: "created", actor: event.args.creator })),
    ...donations.map((event) => ({
      event,
      type: "donation",
      actor: event.args.contributor,
      amount: weiToEther(event.args.amount),
      text: event.args.message,
    })),
    ...editHistory(created[0], edits),
    ...extensions.map((event) => ({ event, type: "extended", deadline: Number(event.args.newDeadline) })),
    ...updates.map((event) => ({ event, type: "update", text: event.args.message })),
    ...requests.map((event) => ({
      event,
      type: "withdrawRequested",
      amount: weiToEther(event.args.amount),
      text: event.args.description,
      requestId: Number(event.args.requestId),
    })),
    ...approvals.map((event) => ({
      event,
      type: "approved",
      actor: event.args.voter,
      requestId: Number(event.args.requestId),
    })),
    ...rejections.map((event) => ({
      event,
      type: "rejected",
      actor: event.args.voter,
      requestId: Number(event.args.requestId),
    })),
    ...cancels.map((event) => ({
      event,
      type: "cancelled",
      amount: weiToEther(event.args.amount),
      requestId: Number(event.args.requestId),
    })),
    ...withdrawals.map((event) => ({
      event,
      type: "withdrawn",
      amount: weiToEther(event.args.amount),
      requestId: Number(event.args.requestId),
    })),
    ...refunds.map((event) => ({
      event,
      type: "refund",
      actor: event.args.contributor,
      amount: weiToEther(event.args.amount),
    })),
    ...reports.map((event) => ({ event, type: "reported", actor: event.args.reporter, text: event.args.reason })),
    ...verifications.map((event) => ({ event, type: event.args.verified ? "verified" : "unverified" })),
    ...closings.map((event) => ({ event, type: "closed" })),
    ...cancellations.map((event) => ({
      event,
      type: event.args.byAdmin ? "takenDown" : "campaignCancelled",
      text: event.args.reason,
    })),
    ...appeals.map((event) => ({ event, type: "appealed", text: event.args.reason })),
    ...appealResolutions.map((event) => ({
      event,
      type: event.args.accepted ? "appealAccepted" : "appealRejected",
      text: event.args.note,
    })),
  ];

  const times = await blockTimestamps(items.map((item) => item.event));
  return items
    .map(({ event, ...item }) => ({
      ...item,
      id: `${event.transactionHash}-${event.index}`,
      time: times.get(event.blockNumber),
      txHash: event.transactionHash,
      order: event.blockNumber * 10000 + event.index,
    }))
    .sort((a, b) => b.order - a.order);
};

/** Donasi ke beberapa kampanye sekaligus (untuk statistik penggalang dana) */
export const loadDonationsForCampaigns = async (campaignAddresses) => {
  const perCampaign = await Promise.all(
    campaignAddresses.map(async (campaignAddress) =>
      (await loadDonations(campaignAddress)).map((donation) => ({ ...donation, campaignAddress })),
    ),
  );
  return perCampaign.flat().sort((a, b) => a.time - b.time);
};
