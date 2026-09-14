/** @jest-environment node */
import {
  campaignStatus,
  coverGradient,
  daysLeft,
  evaluateWithdrawRequest,
  majorityVotes,
  quorumVotes,
} from "../../lib/campaign";

const DAY = 86400;
const NOW = 1_800_000_000;

const request = (overrides = {}) => ({
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
    expect(evaluateWithdrawRequest(request({ isCompleted: true }), 3, NOW).status).toBe("Completed");
    expect(evaluateWithdrawRequest(request({ isCancelled: true }), 3, NOW).status).toBe("Cancelled");
  });

  test("mayoritas mutlak (50%+1) langsung disetujui, suara seimbang tidak cukup", () => {
    expect(evaluateWithdrawRequest(request({ approvalCount: 1 }), 2, NOW).status).toBe("Voting");
    expect(evaluateWithdrawRequest(request({ approvalCount: 2 }), 2, NOW).status).toBe("Approved");
    expect(evaluateWithdrawRequest(request({ approvalCount: 2 }), 4, NOW).status).toBe("Voting");
    expect(evaluateWithdrawRequest(request({ approvalCount: 3 }), 4, NOW).status).toBe("Approved");
  });

  test("mayoritas menolak langsung ditolak", () => {
    expect(evaluateWithdrawRequest(request({ rejectionCount: 2 }), 3, NOW)).toEqual({
      status: "Rejected",
      reason: "Ditolak mayoritas donatur",
    });
  });

  test("setelah voting berakhir: kuorum 20% & setuju > tolak", () => {
    const ended = NOW + 3 * DAY;
    expect(evaluateWithdrawRequest(request({ approvalCount: 2 }), 10, ended).status).toBe("Approved");
    expect(evaluateWithdrawRequest(request({ approvalCount: 1 }), 10, ended).status).toBe("Rejected");
    expect(evaluateWithdrawRequest(request({ approvalCount: 1, rejectionCount: 1 }), 10, ended).status).toBe(
      "Rejected",
    );
    expect(evaluateWithdrawRequest(request({ approvalCount: 2, rejectionCount: 1 }), 10, ended).status).toBe(
      "Approved",
    );
    expect(evaluateWithdrawRequest(request(), 2, ended).status).toBe("Rejected");
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
  });

  test("daysLeft", () => {
    expect(daysLeft(NOW + 30.5 * DAY, NOW)).toBe(30);
    expect(daysLeft(NOW - DAY, NOW)).toBe(0);
  });

  test("coverGradient konsisten untuk alamat yang sama", () => {
    expect(coverGradient("0xabc")).toBe(coverGradient("0xabc"));
  });
});
