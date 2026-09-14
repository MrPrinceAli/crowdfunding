/** @jest-environment node */
import { formatIdr } from "../../lib/ethPrice";

const normalize = (text) => text.replace(/\s/g, " ");

describe("formatIdr", () => {
  test("nilai besar memakai notasi ringkas", () => {
    expect(normalize(formatIdr(6.5, 45_000_000))).toBe("Rp 292,5 jt");
  });

  test("nilai kecil ditulis penuh", () => {
    expect(normalize(formatIdr(0.01, 45_000_000))).toBe("Rp 450.000");
  });
});
