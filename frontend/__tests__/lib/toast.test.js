/** @jest-environment node */
import { getErrorMessage } from "../../lib/toast";

describe("getErrorMessage", () => {
  test("transaksi dibatalkan pengguna", () => {
    expect(getErrorMessage({ code: 4001, message: "User denied transaction signature" })).toBe(
      "Transaksi dibatalkan di MetaMask",
    );
  });

  test("revert dari contract", () => {
    const error = new Error(
      "Error: VM Exception while processing transaction: reverted with reason string 'Withdraw request is not approved'",
    );
    expect(getErrorMessage(error)).toBe("Transaksi ditolak contract: Withdraw request is not approved");
  });

  test("error lain diteruskan apa adanya", () => {
    expect(getErrorMessage(new Error("Network error"))).toBe("Network error");
    expect(getErrorMessage(null)).toBe("Terjadi kesalahan");
  });
});
