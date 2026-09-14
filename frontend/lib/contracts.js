import Web3 from "web3";
import CrowdfundingArtifact from "../artifacts/contracts/Crowdfunding.sol/Crowdfunding.json";
import ProjectArtifact from "../artifacts/contracts/Project.sol/Project.json";
import { CAMPAIGN_STATE, REQUEST_STATUS } from "./campaign";
import { CROWDFUNDING_ADDRESS, RPC_URL } from "./config";
import { etherToWei, weiToEther } from "./format";

const ALL_BLOCKS = { fromBlock: 0, toBlock: "latest" };

// ---------------------------------------------------------------------------
// Koneksi
// ---------------------------------------------------------------------------

/** MetaMask jika tersedia, selain itu langsung ke RPC (hanya baca) */
export const createWeb3 = () => new Web3(Web3.givenProvider || RPC_URL);

export const getAccount = async (web3) => (await web3.eth.getAccounts())[0] ?? null;

const crowdfundingContract = (web3) => new web3.eth.Contract(CrowdfundingArtifact.abi, CROWDFUNDING_ADDRESS);

const projectContract = (web3, address) => new web3.eth.Contract(ProjectArtifact.abi, address);

// ---------------------------------------------------------------------------
// Kampanye
// ---------------------------------------------------------------------------

const toCampaign = (address, details, summary) => {
  const raisedAmount = Number(weiToEther(details.currentAmount));
  const goalAmount = Number(weiToEther(details.goalAmount));
  return {
    address,
    creator: details.projectCreator,
    title: details.title,
    description: details.description,
    minContribution: Number(weiToEther(details.minContribution)),
    goalAmount,
    raisedAmount,
    balance: Number(weiToEther(details.balance)),
    state: CAMPAIGN_STATE[Number(details.currentState)],
    deadline: Number(details.projectDeadline),
    progress: goalAmount > 0 ? Math.round((raisedAmount / goalAmount) * 100) : 0,
    ...summary,
  };
};

/** Ringkasan penarikan dana: sudah ditarik, sedang diajukan, jumlah voting aktif */
const loadWithdrawSummary = async (project) => {
  const [count, pendingWei, contributorCount] = await Promise.all([
    project.methods.withdrawRequestCount().call(),
    project.methods.pendingWithdrawAmount().call(),
    project.methods.contributorCount().call(),
  ]);

  let withdrawnAmount = 0;
  let activeVotingCount = 0;
  for (let id = 0; id < Number(count); id++) {
    const [request, status] = await Promise.all([
      project.methods.withdrawRequests(id).call(),
      project.methods.getRequestStatus(id).call(),
    ]);
    if (request.isCompleted) withdrawnAmount += Number(weiToEther(request.amount));
    if (REQUEST_STATUS[Number(status)] === "Voting") activeVotingCount++;
  }

  return {
    withdrawnAmount,
    pendingWithdrawAmount: Number(weiToEther(pendingWei)),
    activeVotingCount,
    contributorCount: Number(contributorCount),
  };
};

export const loadCampaign = async (web3, address) => {
  const project = projectContract(web3, address);
  const [details, summary] = await Promise.all([
    project.methods.getProjectDetails().call(),
    loadWithdrawSummary(project),
  ]);
  return toCampaign(address, details, summary);
};

export const loadCampaigns = async (web3) => {
  const addresses = await crowdfundingContract(web3).methods.getAllProjects().call();
  return Promise.all(addresses.map((address) => loadCampaign(web3, address)));
};

/** @returns alamat contract kampanye baru */
export const createCampaign = async (web3, account, { minContribution, deadline, goalAmount, title, description }) => {
  const receipt = await crowdfundingContract(web3)
    .methods.createProject(etherToWei(minContribution), deadline, etherToWei(goalAmount), title, description)
    .send({ from: account });
  return receipt.events.ProjectCreated.returnValues.projectAddress;
};

export const contribute = (web3, account, campaignAddress, amountEth) =>
  crowdfundingContract(web3)
    .methods.contribute(campaignAddress)
    .send({ from: account, value: etherToWei(amountEth) });

/** Donatur kampanye beserta total donasinya */
export const loadContributors = async (web3, campaignAddress) => {
  const events = await projectContract(web3, campaignAddress).getPastEvents("FundingReceived", ALL_BLOCKS);
  const totals = new Map();
  events.forEach(({ returnValues }) => {
    const amount = Number(weiToEther(returnValues.amount));
    totals.set(returnValues.contributor, (totals.get(returnValues.contributor) || 0) + amount);
  });
  return [...totals].map(([contributor, amount]) => ({ contributor, amount }));
};

/** Riwayat donasi sebuah akun ke semua kampanye */
export const loadMyContributions = async (web3, account) => {
  const events = await crowdfundingContract(web3).getPastEvents("ContributionReceived", {
    ...ALL_BLOCKS,
    filter: { contributor: account },
  });
  return events.map(({ returnValues }) => ({
    campaignAddress: returnValues.projectAddress,
    amount: Number(weiToEther(returnValues.amount)),
  }));
};

// ---------------------------------------------------------------------------
// Permintaan penarikan dana
// ---------------------------------------------------------------------------

const toWithdrawRequest = (id, request, status) => ({
  id,
  description: request.description,
  amount: Number(weiToEther(request.amount)),
  recipient: request.recipient,
  approvalCount: Number(request.approvalCount),
  rejectionCount: Number(request.rejectionCount),
  votingDeadline: Number(request.votingDeadline),
  isCompleted: request.isCompleted,
  isCancelled: request.isCancelled,
  status: REQUEST_STATUS[Number(status)],
});

export const loadWithdrawRequests = async (web3, campaignAddress) => {
  const project = projectContract(web3, campaignAddress);
  const count = Number(await project.methods.withdrawRequestCount().call());
  if (count === 0) return [];

  // Bukti transaksi (hash & waktu) untuk penarikan yang sudah selesai
  const completedEvents = await project.getPastEvents("WithdrawCompleted", ALL_BLOCKS);
  const proofs = {};
  await Promise.all(
    completedEvents.map(async (event) => {
      const block = await web3.eth.getBlock(event.blockNumber);
      proofs[Number(event.returnValues.requestId)] = {
        txHash: event.transactionHash,
        completedAt: Number(block.timestamp),
      };
    }),
  );

  return Promise.all(
    Array.from({ length: count }, async (_, id) => {
      const [request, status] = await Promise.all([
        project.methods.withdrawRequests(id).call(),
        project.methods.getRequestStatus(id).call(),
      ]);
      return { ...toWithdrawRequest(id, request, status), ...proofs[id] };
    }),
  );
};

export const createWithdrawRequest = (web3, account, campaignAddress, { description, amount, recipient }) =>
  projectContract(web3, campaignAddress)
    .methods.createWithdrawRequest(description, etherToWei(amount), recipient)
    .send({ from: account });

const sendRequestAction = (method) => (web3, account, campaignAddress, requestId) =>
  projectContract(web3, campaignAddress).methods[method](requestId).send({ from: account });

export const approveWithdrawRequest = sendRequestAction("approveWithdrawRequest");
export const rejectWithdrawRequest = sendRequestAction("rejectWithdrawRequest");
export const cancelWithdrawRequest = sendRequestAction("cancelWithdrawRequest");
export const executeWithdrawRequest = sendRequestAction("executeWithdrawRequest");

/** @returns 0 = belum memilih, 1 = setuju, 2 = tolak */
export const getVote = async (web3, campaignAddress, requestId, account) =>
  Number(await projectContract(web3, campaignAddress).methods.getVote(requestId, account).call());

/** Permintaan yang sedang voting dan belum dipilih oleh akun (dari kampanye yang didukungnya) */
export const loadPendingVotes = async (web3, account, campaignAddresses) => {
  const perCampaign = await Promise.all(
    campaignAddresses.map(async (campaignAddress) => {
      const project = projectContract(web3, campaignAddress);
      const [contributed, count] = await Promise.all([
        project.methods.contributions(account).call(),
        project.methods.withdrawRequestCount().call(),
      ]);
      if (Number(contributed) === 0) return [];

      const pending = [];
      for (let id = 0; id < Number(count); id++) {
        const [status, vote] = await Promise.all([
          project.methods.getRequestStatus(id).call(),
          project.methods.getVote(id, account).call(),
        ]);
        if (REQUEST_STATUS[Number(status)] !== "Voting" || Number(vote) !== 0) continue;
        const request = await project.methods.withdrawRequests(id).call();
        pending.push({ campaignAddress, ...toWithdrawRequest(id, request, status) });
      }
      return pending;
    }),
  );
  return perCampaign.flat().sort((a, b) => a.votingDeadline - b.votingDeadline);
};
