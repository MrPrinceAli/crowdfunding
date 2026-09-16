/** @jest-environment node */
import fs from "fs";
import path from "path";
import en from "../../lib/i18n/en";
import id from "../../lib/i18n/id";
import { translate } from "../../lib/i18n";
import { CATEGORIES, PROVINCES, REQUEST_STATUS, SORT_OPTIONS } from "../../lib/campaign";
import { TYPES_BY_ROLE } from "../../lib/notifications";
import { THEMES } from "../../lib/preferences";

// Kunci yang dipakai CancelForm lewat prefix `cancel.` / `takedown.`
const CANCEL_KEYS = [
  "errorReason",
  "done",
  "warning",
  "reason",
  "reasonPlaceholder",
  "confirm",
  "submit",
  "noticeTitle",
];

const SOURCE_DIRS = ["components", "pages", "hooks", "lib"];

const sourceFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "i18n" ? [] : sourceFiles(full);
    return /\.js$/.test(entry.name) ? [full] : [];
  });

/** Kunci statis yang dipakai di kode: t("...") atau translate("...") */
const usedKeys = () => {
  const keys = new Set();
  SOURCE_DIRS.flatMap((dir) => sourceFiles(path.join(__dirname, "../..", dir))).forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/\b(?:t|translate)\(\s*["']([a-zA-Z0-9.]+)["']/g)) keys.add(match[1]);
  });
  return [...keys];
};

/** Kunci dinamis (template literal) beserta seluruh nilainya */
const DYNAMIC_KEYS = {
  "activity.{}": [
    "created",
    "donation",
    "edited",
    "extended",
    "closed",
    "campaignCancelled",
    "takenDown",
    "appealed",
    "appealAccepted",
    "appealRejected",
    "update",
    "withdrawRequested",
    "approved",
    "rejected",
    "cancelled",
    "withdrawn",
    "refund",
    "reported",
    "verified",
    "unverified",
  ],
  "activity.filter.{}": ["all", "donations", "withdrawals", "updates"],
  "admin.tab.{}": ["reported", "queue", "verified", "appeals", "takenDown"],
  "admin.empty.{}": ["reported", "queue", "verified", "appeals", "takenDown"],
  "category.{}": CATEGORIES,
  "contributions.tab.{}": ["history", "mine"],
  "dashboard.empty.{}.title": ["favorites", "filtered", "none"],
  "dashboard.empty.{}.description": ["favorites", "filtered", "none"],
  "dashboard.filter.{}": ["all", "active", "successful", "ended", "favorites"],
  "dashboard.sort.{}": SORT_OPTIONS,
  "landing.step{}Title": [1, 2, 3, 4],
  "landing.step{}Text": [1, 2, 3, 4],
  "preferences.theme.{}": THEMES,
  "report.reason.{}": ["fake", "misuse", "fraud", "inappropriate", "other"],
  "status.{}": ["active", "successful", "ended", "cancelled", "takenDown"],
  "withdraw.status.{}": REQUEST_STATUS,
  "editHistory.field.{}": ["description", "category", "location", "imageUrl"],
  "province.{}": PROVINCES,
  "notification.{}": Object.values(TYPES_BY_ROLE).flat(),
  "cancel.{}": CANCEL_KEYS,
  "takedown.{}": CANCEL_KEYS,
  "withdraw.reason.{}": [
    "majorityApproved",
    "majorityRejected",
    "quorumNotReached",
    "moreApprovals",
    "notMoreApprovals",
  ],
};

const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("i18n", () => {
  test("setiap kunci yang dipakai di kode ada di kedua bahasa", () => {
    const missing = usedKeys().filter((key) => !(key in id) || !(key in en));
    expect(missing).toEqual([]);
  });

  test("setiap kunci dinamis ada di kedua bahasa", () => {
    const keys = Object.entries(DYNAMIC_KEYS).flatMap(([pattern, values]) =>
      values.map((value) => pattern.replace("{}", value)),
    );
    expect(keys.filter((key) => !(key in id) || !(key in en))).toEqual([]);
  });

  test("kamus Indonesia & Inggris punya kunci dan placeholder yang sama", () => {
    // Kunci bentuk tunggal "<kunci>.one" boleh hanya ada di bahasa Inggris, asalkan kunci dasarnya ada
    const singularKeys = Object.keys(en).filter((key) => key.endsWith(".one"));
    expect(singularKeys.filter((key) => !(key.slice(0, -4) in en))).toEqual([]);
    expect(
      Object.keys(en)
        .filter((key) => !singularKeys.includes(key))
        .sort(),
    ).toEqual(Object.keys(id).sort());
    const mismatched = Object.keys(id).filter(
      (key) => JSON.stringify(placeholders(id[key])) !== JSON.stringify(placeholders(en[key])),
    );
    expect(mismatched).toEqual([]);
  });

  test("translate mengganti placeholder dan memakai fallback", () => {
    expect(translate("campaign.daysLeft", { days: 5 }, "id")).toBe("5 hari lagi");
    expect(translate("campaign.daysLeft", { days: 5 }, "en")).toBe("5 days left");
    expect(translate("tidak.ada", {}, "en")).toBe("tidak.ada");
    expect(translate("stats.campaignCount", { count: 1 }, "en")).toBe("1 campaign");
    expect(translate("stats.campaignCount", { count: 2 }, "en")).toBe("2 campaigns");
    expect(translate("stats.campaignCount", { count: 1 }, "id")).toBe("1 kampanye");
  });
});
