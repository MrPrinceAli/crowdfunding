import { CATEGORIES, campaignStatus } from "./campaign";

const DAY = 86400;

/** Awal hari (waktu lokal) dari timestamp detik */
export const startOfDay = (seconds) => {
  const date = new Date(seconds * 1000);
  date.setHours(0, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
};

/** Total donasi per donatur, diurutkan dari yang terbesar */
export const groupByContributor = (donations) => {
  const totals = new Map();
  donations.forEach(({ contributor, amount }) => totals.set(contributor, (totals.get(contributor) || 0) + amount));
  return [...totals].map(([contributor, amount]) => ({ contributor, amount })).sort((a, b) => b.amount - a.amount);
};

/** Titik kumulatif dana terkumpul: [{ time, total }], diawali 0 pada `startTime` bila diberikan */
export const cumulativeSeries = (donations, startTime) => {
  let total = 0;
  const points = [...donations]
    .sort((a, b) => a.time - b.time)
    .map((donation) => {
      total += donation.amount;
      return { time: donation.time, total };
    });
  if (startTime !== undefined && (points.length === 0 || startTime < points[0].time)) {
    points.unshift({ time: startTime, total: 0 });
  }
  return points;
};

/** Total donasi & jumlah donasi per hari untuk `days` hari terakhir sampai `now` (hari tanpa donasi = 0) */
export const dailyTotals = (donations, days, now) => {
  const lastDay = startOfDay(now);
  const buckets = Array.from({ length: days }, (_, index) => ({
    day: lastDay - (days - 1 - index) * DAY,
    total: 0,
    count: 0,
  }));
  const byDay = new Map(buckets.map((bucket) => [bucket.day, bucket]));
  donations.forEach(({ time, amount }) => {
    const bucket = byDay.get(startOfDay(time));
    if (bucket) {
      bucket.total += amount;
      bucket.count += 1;
    }
  });
  return buckets;
};

/** Angka sumbu yang "bersih" (0, 0.5, 1, 2, 5, 10, ...) sampai sedikit di atas nilai maksimum */
export const niceTicks = (max, count = 4) => {
  if (!max || max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= rough);
  const top = Math.ceil(max / step) * step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, index) => +(index * step).toFixed(10));
};

/** Ringkasan platform dari seluruh kampanye (dihitung dari data kampanye & event donasi) */
export const platformSummary = (campaigns, donations) => {
  const totalRaised = campaigns.reduce((sum, campaign) => sum + campaign.raisedAmount, 0);
  const totalWithdrawn = campaigns.reduce((sum, campaign) => sum + campaign.withdrawnAmount, 0);
  const statusCount = (key) => campaigns.filter((campaign) => campaignStatus(campaign).key === key).length;
  const byCategory = CATEGORIES.map((category) => {
    const inCategory = campaigns.filter((campaign) => campaign.category === category);
    return {
      category,
      count: inCategory.length,
      raised: inCategory.reduce((sum, campaign) => sum + campaign.raisedAmount, 0),
    };
  }).sort((a, b) => b.raised - a.raised || b.count - a.count);

  return {
    totalRaised,
    totalWithdrawn,
    activeCount: statusCount("active"),
    successfulCount: statusCount("successful"),
    successRate: campaigns.length ? Math.round((statusCount("successful") / campaigns.length) * 100) : 0,
    donors: donations ? groupByContributor(donations) : null,
    byCategory,
  };
};
