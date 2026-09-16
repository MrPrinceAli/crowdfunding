import { runningCampaigns } from "../../components/landing/CampaignSlides";

const NOW = 1_800_000_000;
const make = (address, extra = {}) => ({ address, state: "Fundraising", deadline: NOW + 86400, ...extra });

describe("runningCampaigns", () => {
  test("hanya kampanye yang masih menerima donasi, terbaru dulu, maksimal 6", () => {
    const campaigns = [
      make("a"),
      make("b", { isCancelled: true }),
      make("c", { isTakenDown: true, isCancelled: true }),
      make("d", { deadline: NOW - 1 }),
      make("e", { state: "Expired" }),
      make("f", { state: "Successful" }), // target tercapai, donasi tetap dibuka sampai deadline
      ...["g", "h", "i", "j", "k"].map((address) => make(address)),
    ];
    expect(runningCampaigns(campaigns, NOW).map((campaign) => campaign.address)).toEqual([
      "k",
      "j",
      "i",
      "h",
      "g",
      "f",
    ]);
    expect(runningCampaigns(null, NOW)).toEqual([]);
  });
});
