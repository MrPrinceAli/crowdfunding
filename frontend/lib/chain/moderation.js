import { blockTimestamp, crowdfunding, project, send } from "./client";

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
