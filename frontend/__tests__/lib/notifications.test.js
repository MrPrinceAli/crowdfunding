import {
  activityToNotifications,
  buildReminders,
  dismissReminders,
  readDismissedReminders,
  readSeenOrder,
  saveSeenOrder,
} from "../../lib/notifications";

const ME = "0x1111111111111111111111111111111111111111";
const OTHER = "0x2222222222222222222222222222222222222222";
const campaign = { address: "0xCampaign", title: "Beasiswa", creator: ME };

const activity = [
  { type: "donation", actor: OTHER, amount: 1, order: 6 },
  { type: "donation", actor: ME, amount: 2, order: 5 },
  { type: "withdrawRequested", amount: 1, requestId: 0, order: 4 },
  { type: "update", text: "Kabar", order: 3 },
  { type: "approved", actor: OTHER, requestId: 0, order: 2 },
  { type: "takenDown", text: "Penipuan", order: 1 },
];

describe("notifications", () => {
  test("pemilik kampanye: donasi & voting dari orang lain, bukan aksi sendiri", () => {
    const items = activityToNotifications(activity, campaign, "owner", ME);
    expect(items.map((item) => item.type)).toEqual(["donation", "approved", "takenDown"]);
    expect(items[0]).toMatchObject({ campaignAddress: "0xCampaign", campaignTitle: "Beasiswa", role: "owner" });
  });

  test("donatur: permintaan penarikan, kabar, dan pembatalan", () => {
    const items = activityToNotifications(activity, campaign, "donor", OTHER);
    expect(items.map((item) => item.type)).toEqual(["withdrawRequested", "update", "takenDown"]);
  });

  test("favorit: hanya kabar penting", () => {
    const items = activityToNotifications(activity, campaign, "favorite", OTHER);
    expect(items.map((item) => item.type)).toEqual(["update", "takenDown"]);
  });

  test("status dibaca disimpan per akun", () => {
    window.localStorage.clear();
    expect(readSeenOrder(ME)).toBe(0);
    saveSeenOrder(ME, 1234);
    expect(readSeenOrder(ME.toUpperCase().replace("0X", "0x"))).toBe(1234);
    expect(readSeenOrder(OTHER)).toBe(0);
  });

  test("pengingat hanya untuk favorit aktif yang berakhir ≤ 3 hari, bukan milik sendiri atau dibatalkan", () => {
    const NOW = 1_800_000_000;
    const DAY = 86400;
    const make = (address, extra) => ({ address, title: address, creator: OTHER, deadline: NOW + DAY, ...extra });
    const campaigns = [
      make("0xA", { deadline: NOW + 2 * DAY }),
      make("0xB", { deadline: NOW + 5 * DAY }), // masih lama
      make("0xC", { creator: ME }), // milik sendiri
      make("0xD", { isCancelled: true }), // dibatalkan
      make("0xE", { deadline: NOW - 1 }), // sudah berakhir
      make("0xF", { deadline: NOW + DAY }), // bukan favorit
      make("0xG", { deadline: NOW + 3 * DAY }),
    ];
    const reminders = buildReminders({
      account: ME,
      campaigns,
      favorites: ["0xa", "0xB", "0xC", "0xD", "0xE", "0xG"],
      now: NOW,
    });
    expect(reminders.map((item) => item.campaignAddress)).toEqual(["0xA", "0xG"]);
    expect(reminders[0]).toMatchObject({ type: "endingSoon", id: `ending-0xa-${NOW + 2 * DAY}` });
  });

  test("pengingat yang dibaca disimpan per akun tanpa duplikat", () => {
    window.localStorage.clear();
    expect(readDismissedReminders(ME)).toEqual([]);
    dismissReminders(ME, ["a", "b"]);
    expect(dismissReminders(ME, ["b", "c"])).toEqual(["a", "b", "c"]);
    expect(readDismissedReminders(OTHER)).toEqual([]);
  });
});
