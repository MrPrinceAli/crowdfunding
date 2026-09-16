import { weiToEther } from "../format";
import { blockTimestamps, crowdfunding, project } from "./client";
import { loadDonations } from "./campaigns";

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
