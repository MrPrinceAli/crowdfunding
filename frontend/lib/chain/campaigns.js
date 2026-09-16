import { APPEAL_STATUS, CAMPAIGN_STATE, REQUEST_STATUS } from "../campaign";
import { etherToWei, weiToEther } from "../format";
import { blockTimestamp, blockTimestamps, crowdfunding, project, send } from "./client";

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
