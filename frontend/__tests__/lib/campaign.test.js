/** @jest-environment node */
import {
  appealDeadline,
  campaignStatus,
  PROVINCES,
  coverGradient,
  daysLeft,
  evaluateWithdrawRequest,
  majorityVotes,
  paginate,
  quorumVotes,
  sortCampaigns,
} from "../../lib/campaign";

const DAY = 86400;
const NOW = 1_800_000_000;

const request = (voters, overrides = {}) => ({
  eligibleVoterCount: voters,
  approvalCount: 0,
  rejectionCount: 0,
  votingDeadline: NOW + 3 * DAY,
  isCompleted: false,
  isCancelled: false,
  ...overrides,
});

// Skenario sama dengan test Project.getRequestStatus() di smart-contract/test/project.test.js
describe("evaluateWithdrawRequest", () => {
  test("selesai & dibatalkan", () => {
    expect(evaluateWithdrawRequest(request(3, { isCompleted: true }), NOW).status).toBe("Completed");
    expect(evaluateWithdrawRequest(request(3, { isCancelled: true }), NOW).status).toBe("Cancelled");
  });

  test("mayoritas mutlak (50%+1) langsung disetujui, suara seimbang tidak cukup", () => {
    expect(evaluateWithdrawRequest(request(2, { approvalCount: 1 }), NOW).status).toBe("Voting");
    expect(evaluateWithdrawRequest(request(2, { approvalCount: 2 }), NOW).status).toBe("Approved");
    expect(evaluateWithdrawRequest(request(4, { approvalCount: 2 }), NOW).status).toBe("Voting");
    expect(evaluateWithdrawRequest(request(4, { approvalCount: 3 }), NOW).status).toBe("Approved");
  });

  test("mayoritas menolak langsung ditolak", () => {
    expect(evaluateWithdrawRequest(request(3, { rejectionCount: 2 }), NOW)).toEqual({
      status: "Rejected",
      reason: "majorityRejected",
    });
  });

  test("setelah voting berakhir: kuorum 20% & setuju > tolak", () => {
    const ended = NOW + 3 * DAY;
    expect(evaluateWithdrawRequest(request(10, { approvalCount: 2 }), ended).status).toBe("Approved");
    expect(evaluateWithdrawRequest(request(10, { approvalCount: 1 }), ended).status).toBe("Rejected");
    expect(evaluateWithdrawRequest(request(10, { approvalCount: 1, rejectionCount: 1 }), ended).status).toBe(
      "Rejected",
    );
    expect(evaluateWithdrawRequest(request(10, { approvalCount: 2, rejectionCount: 1 }), ended).status).toBe(
      "Approved",
    );
    expect(evaluateWithdrawRequest(request(2), ended).status).toBe("Rejected");
  });

  test("jumlah suara yang dibutuhkan", () => {
    expect([1, 2, 3, 4, 5, 10].map(majorityVotes)).toEqual([1, 2, 2, 3, 3, 6]);
    expect([1, 5, 10, 11].map(quorumVotes)).toEqual([1, 1, 2, 3]);
  });
});

describe("campaign", () => {
  test("campaignStatus", () => {
    expect(campaignStatus({ state: "Successful", deadline: NOW - DAY }, NOW).key).toBe("successful");
    expect(campaignStatus({ state: "Fundraising", deadline: NOW - 1 }, NOW).key).toBe("ended");
    expect(campaignStatus({ state: "Fundraising", deadline: NOW + DAY }, NOW).key).toBe("active");
    expect(campaignStatus({ state: "Successful", deadline: NOW + DAY, isCancelled: true }, NOW).key).toBe("cancelled");
    expect(campaignStatus({ state: "Fundraising", deadline: NOW, isCancelled: true, isTakenDown: true }, NOW).key).toBe(
      "takenDown",
    );
  });

  test("daysLeft", () => {
    expect(daysLeft(NOW + 30.5 * DAY, NOW)).toBe(30);
    expect(daysLeft(NOW - DAY, NOW)).toBe(0);
  });

  test("coverGradient konsisten untuk alamat yang sama", () => {
    expect(coverGradient("0xabc")).toBe(coverGradient("0xabc"));
  });
});

describe("sort & pagination", () => {
  const campaigns = [
    { address: "a", raisedAmount: 1, progress: 10, deadline: NOW + 10 * DAY },
    { address: "b", raisedAmount: 5, progress: 90, deadline: NOW - DAY },
    { address: "c", raisedAmount: 3, progress: 50, deadline: NOW + 2 * DAY },
  ];
  const order = (list) => list.map((campaign) => campaign.address);

  test("sortCampaigns", () => {
    expect(order(sortCampaigns(campaigns, "newest", NOW))).toEqual(["c", "b", "a"]);
    expect(order(sortCampaigns(campaigns, "ending", NOW))).toEqual(["c", "a", "b"]);
    expect(order(sortCampaigns(campaigns, "raised", NOW))).toEqual(["b", "c", "a"]);
    expect(order(sortCampaigns(campaigns, "progress", NOW))).toEqual(["b", "c", "a"]);
    expect(order(campaigns)).toEqual(["a", "b", "c"]); // array asli tidak berubah
  });

  test("paginate", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);
    expect(paginate(items, 1, 9)).toEqual({ items: items.slice(0, 9), page: 1, pageCount: 3 });
    expect(paginate(items, 3, 9).items).toEqual([18, 19]);
    expect(paginate(items, 99, 9).page).toBe(3);
    expect(paginate([], 1, 9)).toEqual({ items: [], page: 1, pageCount: 1 });
  });

  test("appealDeadline = 14 hari setelah takedown", () => {
    expect(appealDeadline({ takenDownAt: NOW })).toBe(NOW + 14 * DAY);
    expect(appealDeadline({ takenDownAt: 0 })).toBe(0);
  });

  test("38 provinsi + nasional & luar negeri, tanpa duplikat", () => {
    expect(PROVINCES).toHaveLength(40);
    expect(new Set(PROVINCES).size).toBe(40);
  });
});
