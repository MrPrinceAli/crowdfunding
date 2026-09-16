import {
  cumulativeSeries,
  dailyTotals,
  groupByContributor,
  niceTicks,
  platformSummary,
  startOfDay,
} from "../../lib/stats";

const DAY = 86400;
const NOW = startOfDay(Math.floor(new Date(2026, 8, 15, 12).getTime() / 1000)) + 12 * 3600;

describe("stats", () => {
  test("groupByContributor menjumlahkan & mengurutkan dari terbesar", () => {
    const donations = [
      { contributor: "0xA", amount: 1 },
      { contributor: "0xB", amount: 3 },
      { contributor: "0xA", amount: 2.5 },
    ];
    expect(groupByContributor(donations)).toEqual([
      { contributor: "0xA", amount: 3.5 },
      { contributor: "0xB", amount: 3 },
    ]);
  });

  test("cumulativeSeries mengurutkan waktu dan diawali 0", () => {
    const donations = [
      { time: 300, amount: 2 },
      { time: 200, amount: 1 },
    ];
    expect(cumulativeSeries(donations, 100)).toEqual([
      { time: 100, total: 0 },
      { time: 200, total: 1 },
      { time: 300, total: 3 },
    ]);
    expect(cumulativeSeries([], 100)).toEqual([{ time: 100, total: 0 }]);
    expect(cumulativeSeries(donations)).toHaveLength(2);
  });

  test("dailyTotals mengelompokkan per hari dan mengisi hari kosong", () => {
    const donations = [
      { time: NOW, amount: 1 },
      { time: NOW - 3600, amount: 0.5 },
      { time: NOW - 2 * DAY, amount: 2 },
      { time: NOW - 10 * DAY, amount: 9 }, // di luar rentang
    ];
    const buckets = dailyTotals(donations, 3, NOW);
    expect(buckets.map((bucket) => bucket.total)).toEqual([2, 0, 1.5]);
    expect(buckets.map((bucket) => bucket.count)).toEqual([1, 0, 2]);
    expect(buckets[2].day).toBe(startOfDay(NOW));
  });

  test("niceTicks menghasilkan angka sumbu yang bersih", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(10)).toEqual([0, 2.5, 5, 7.5, 10]);
    expect(niceTicks(7.3)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(0.3)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  test("platformSummary menghitung total, tingkat keberhasilan, dan dana per kategori", () => {
    const base = { state: "Fundraising", deadline: Math.floor(Date.now() / 1000) + 10 * DAY, withdrawnAmount: 0 };
    const campaigns = [
      { ...base, category: "Pendidikan", raisedAmount: 4, withdrawnAmount: 1 },
      { ...base, category: "Kesehatan", raisedAmount: 10, state: "Successful" },
      { ...base, category: "Pendidikan", raisedAmount: 2, isCancelled: true },
      { ...base, category: "Sosial", raisedAmount: 0 },
    ];
    const donations = [
      { contributor: "0xA", amount: 4 },
      { contributor: "0xB", amount: 10 },
      { contributor: "0xA", amount: 2 },
    ];
    const summary = platformSummary(campaigns, donations);

    expect(summary.totalRaised).toBe(16);
    expect(summary.totalWithdrawn).toBe(1);
    expect(summary.activeCount).toBe(2);
    expect(summary.successfulCount).toBe(1);
    expect(summary.successRate).toBe(25);
    expect(summary.donors).toEqual([
      { contributor: "0xB", amount: 10 },
      { contributor: "0xA", amount: 6 },
    ]);
    expect(summary.byCategory.slice(0, 3)).toEqual([
      { category: "Kesehatan", count: 1, raised: 10 },
      { category: "Pendidikan", count: 2, raised: 6 },
      { category: "Sosial", count: 1, raised: 0 },
    ]);
    expect(platformSummary(campaigns, null).donors).toBeNull();
  });
});
