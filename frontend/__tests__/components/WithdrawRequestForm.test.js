import { fireEvent, screen, waitFor } from "@testing-library/react";
import WithdrawRequestForm from "../../components/withdraw/WithdrawRequestForm";
import { createWithdrawRequest } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { campaign, CREATOR, renderWithStore } from "../helpers/render";

jest.mock("../../lib/ethPrice", () => ({ useEthIdrPrice: () => null, formatIdr: () => "" }));
jest.mock("../../lib/contracts", () => ({
  getSigner: jest.fn(async () => ({})),
  createWithdrawRequest: jest.fn(async () => true),
}));
jest.mock("../../lib/toast", () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
  getErrorMessage: (error) => error.message,
}));

const setup = (overrides) =>
  renderWithStore(<WithdrawRequestForm campaign={campaign(overrides)} onCreated={jest.fn()} />, {
    wallet: { account: CREATOR },
  });

beforeEach(() => jest.clearAllMocks());

describe("WithdrawRequestForm", () => {
  test("saldo tersedia dikurangi pengajuan yang belum ditarik", () => {
    setup({ balance: 6.5, pendingWithdrawAmount: 2 });
    expect(screen.getByText("4,5 ETH")).toBeInTheDocument();
  });

  test("alasan wajib diisi", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajukan Penarikan" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Tuliskan alasan penarikan agar donatur bisa menilai sebelum voting"),
    );
    expect(createWithdrawRequest).not.toHaveBeenCalled();
  });

  test("jumlah melebihi saldo tersedia ditolak", async () => {
    setup({ balance: 2, pendingWithdrawAmount: 0 });
    fireEvent.change(screen.getByLabelText("Alasan penarikan"), { target: { value: "Beli buku" } });
    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajukan Penarikan" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Jumlah penarikan melebihi saldo yang tersedia (2 ETH)"),
    );
    expect(createWithdrawRequest).not.toHaveBeenCalled();
  });

  test("pengajuan valid memakai alamat pembuat sebagai penerima", async () => {
    setup();
    fireEvent.change(screen.getByLabelText("Alasan penarikan"), { target: { value: "Beli buku" } });
    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Ajukan Penarikan" }));

    await waitFor(() => expect(createWithdrawRequest).toHaveBeenCalled());
    const [, address, payload] = createWithdrawRequest.mock.calls[0];
    expect(address).toBe(campaign().address);
    expect(payload).toEqual({ description: "Beli buku", amount: "1.5", recipient: CREATOR });
  });
});
