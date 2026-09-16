import { REQUEST_STATUS } from "../campaign";
import { etherToWei, weiToEther } from "../format";
import { blockTimestamp, project, send } from "./client";

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
