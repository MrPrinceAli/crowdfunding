/** @jest-environment node */
import fs from "fs";
import path from "path";
import RULES from "../../lib/abi/rules.json";
import {
  ABANDON_PERIOD_DAYS,
  APPEAL_PERIOD_DAYS,
  MAX_EXTENSION_DAYS,
  MAX_MESSAGE_LENGTH,
  MAX_NAME_BYTES,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_URL_LENGTH,
  QUORUM_PERCENT,
  VOTING_PERIOD_DAYS,
} from "../../lib/campaign";

const UNITS = { days: 86400, hours: 3600, minutes: 60 };

/** Konstanta `uint256 public constant` langsung dari file Solidity */
const solidityConstants = () => {
  const dir = path.join(__dirname, "../../../smart-contract/contracts");
  return ["Crowdfunding", "Project"].reduce((all, name) => {
    const source = fs.readFileSync(path.join(dir, `${name}.sol`), "utf8");
    for (const [, key, value, unit] of source.matchAll(
      /uint256 public constant (\w+) = (\d+)(?:\s+(days|hours|minutes))?;/g,
    )) {
      all[key] = Number(value) * (UNITS[unit] || 1);
    }
    return all;
  }, {});
};

describe("aturan platform", () => {
  test("rules.json sama persis dengan konstanta di Solidity", () => {
    // Kalau test ini gagal: jalankan `npm run compile` di smart-contract
    expect(RULES).toEqual(solidityConstants());
  });

  test("konstanta frontend diturunkan dari rules.json, bukan angka yang ditulis ulang", () => {
    expect(VOTING_PERIOD_DAYS).toBe(RULES.VOTING_PERIOD / 86400);
    expect(ABANDON_PERIOD_DAYS).toBe(RULES.ABANDON_PERIOD / 86400);
    expect(MAX_EXTENSION_DAYS).toBe(RULES.MAX_EXTENSION / 86400);
    expect(APPEAL_PERIOD_DAYS).toBe(RULES.APPEAL_PERIOD / 86400);
    expect(QUORUM_PERCENT).toBe(RULES.QUORUM_PERCENT);
    expect(MAX_MESSAGE_LENGTH).toBe(RULES.MAX_MESSAGE_LENGTH);
    expect(MAX_TITLE_LENGTH).toBe(RULES.MAX_TITLE_LENGTH);
    expect(MAX_TEXT_LENGTH).toBe(RULES.MAX_TEXT_LENGTH);
    expect(MAX_URL_LENGTH).toBe(RULES.MAX_URL_LENGTH);
    expect(MAX_NAME_BYTES).toBe(RULES.MAX_NAME_LENGTH);
  });
});
