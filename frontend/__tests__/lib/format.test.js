/** @jest-environment node */
import {
  etherToWei,
  formatDate,
  formatEth,
  formatTimeLeft,
  sameAddress,
  shortAddress,
  weiToEther,
} from "../../lib/format";

describe("format", () => {
  test("konversi ETH <-> wei", () => {
    expect(etherToWei("1.5")).toBe("1500000000000000000");
    expect(weiToEther("250000000000000000")).toBe("0.25");
    expect(weiToEther(undefined)).toBe("0");
  });

  test("formatEth memakai format angka Indonesia", () => {
    expect(formatEth(10.7)).toBe("10,7 ETH");
    expect(formatEth(0.123456)).toBe("0,1235 ETH");
    expect(formatEth(undefined)).toBe("0 ETH");
  });

  test("formatDate dari UNIX timestamp (detik)", () => {
    const seconds = new Date(2026, 9, 14, 23, 59, 59).getTime() / 1000;
    expect(formatDate(seconds)).toBe("14/10/2026");
  });

  test("formatTimeLeft", () => {
    const now = 1_000_000;
    expect(formatTimeLeft(now + 2 * 86400 + 3 * 3600, now)).toBe("2 hari 3 jam");
    expect(formatTimeLeft(now + 5 * 3600 + 10 * 60, now)).toBe("5 jam 10 menit");
    expect(formatTimeLeft(now + 30, now)).toBe("1 menit");
    expect(formatTimeLeft(now - 100, now)).toBe("1 menit");
  });

  test("alamat", () => {
    expect(shortAddress("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")).toBe("0xf39F...2266");
    expect(shortAddress("")).toBe("");
    expect(sameAddress("0xABC", "0xabc")).toBe(true);
    expect(sameAddress("0xABC", undefined)).toBe(false);
  });
});
