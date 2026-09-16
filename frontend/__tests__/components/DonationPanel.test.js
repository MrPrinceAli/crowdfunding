import { fireEvent, screen, waitFor } from "@testing-library/react";
import DonationPanel from "../../components/campaign/DonationPanel";
import { claimRefund, contribute } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { campaign, CREATOR, DONOR, renderWithStore } from "../helpers/render";

jest.mock("../../lib/ethPrice", () => ({ useEthIdrPrice: () => null, formatIdr: () => "" }));
jest.mock("../../lib/contracts", () => ({
  getSigner: jest.fn(async () => ({})),
  contribute: jest.fn(async () => true),
  claimRefund: jest.fn(async () => true),
}));
jest.mock("../../lib/toast", () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
  getErrorMessage: (error) => error.message,
}));

beforeEach(() => jest.clearAllMocks());

describe("DonationPanel", () => {
  test("donatur bisa berdonasi beserta pesan dukungan", async () => {
    renderWithStore(<DonationPanel campaign={campaign()} accountInfo={null} />, { wallet: { account: DONOR } });

    fireEvent.change(screen.getByLabelText("Jumlah donasi"), { target: { value: "0.5" } });
    fireEvent.change(screen.getByLabelText(/Pesan dukungan/), { target: { value: "Semangat!" } });
    fireEvent.click(screen.getByRole("button", { name: "Donasi Sekarang" }));

    await waitFor(() => expect(contribute).toHaveBeenCalled());
    const [, address, amount, message] = contribute.mock.calls[0];
    expect(address).toBe(campaign().address);
    expect(amount).toBe("0.5");
    expect(message).toBe("Semangat!");
  });

  test("donasi di bawah minimum ditolak sebelum transaksi", async () => {
    renderWithStore(<DonationPanel campaign={campaign()} accountInfo={null} />, { wallet: { account: DONOR } });

    fireEvent.change(screen.getByLabelText("Jumlah donasi"), { target: { value: "0.01" } });
    fireEvent.click(screen.getByRole("button", { name: "Donasi Sekarang" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Minimal donasi adalah 0,1 ETH"));
    expect(contribute).not.toHaveBeenCalled();
  });

  test("pembuat kampanye tidak melihat form donasi", () => {
    renderWithStore(<DonationPanel campaign={campaign()} accountInfo={null} />, { wallet: { account: CREATOR } });

    expect(screen.queryByLabelText("Jumlah donasi")).not.toBeInTheDocument();
    expect(screen.getByText(/Kampanye ini milikmu/)).toBeInTheDocument();
    // Pembuat kampanye tetap bisa mengajukan penarikan dana
    expect(screen.getByRole("button", { name: "Ajukan Penarikan" })).toBeInTheDocument();
  });

  test("saat kampanye dibatalkan, donatur bisa menarik kembali bagiannya", async () => {
    renderWithStore(
      <DonationPanel
        campaign={campaign({ isCancelled: true, isRefundOpen: true, balance: 5 })}
        accountInfo={{ contributed: 6, refundable: 3, refundClaimed: false, hasReported: false }}
      />,
      { wallet: { account: DONOR } },
    );

    expect(screen.getByText("Refund dibuka")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tarik bagianku (3 ETH)" }));

    await waitFor(() => expect(claimRefund).toHaveBeenCalled());
  });
});
