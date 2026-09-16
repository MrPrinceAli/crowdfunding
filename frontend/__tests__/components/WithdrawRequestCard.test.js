import { fireEvent, screen, waitFor } from "@testing-library/react";
import WithdrawRequestCard from "../../components/withdraw/WithdrawRequestCard";
import { approveWithdrawRequest, executeWithdrawRequest, loadVoterInfo } from "../../lib/contracts";
import { campaign, CREATOR, DONOR, renderWithStore, withdrawRequest } from "../helpers/render";

jest.mock("../../lib/ethPrice", () => ({ useEthIdrPrice: () => null, formatIdr: () => "" }));
jest.mock("../../lib/contracts", () => ({
  getSigner: jest.fn(async () => ({})),
  loadVoterInfo: jest.fn(async () => ({ vote: 0, canVote: true })),
  approveWithdrawRequest: jest.fn(async () => true),
  rejectWithdrawRequest: jest.fn(async () => true),
  cancelWithdrawRequest: jest.fn(async () => true),
  executeWithdrawRequest: jest.fn(async () => true),
}));
jest.mock("../../lib/toast", () => ({
  toastError: jest.fn(),
  toastSuccess: jest.fn(),
  getErrorMessage: (error) => error.message,
}));

beforeEach(() => jest.clearAllMocks());

describe("WithdrawRequestCard", () => {
  test("donatur yang berhak bisa menyetujui permintaan", async () => {
    renderWithStore(
      <WithdrawRequestCard request={withdrawRequest()} campaign={campaign()} isDonor onChanged={jest.fn()} />,
      { wallet: { account: DONOR } },
    );

    expect(screen.getByText("1 ETH")).toBeInTheDocument();
    expect(screen.getByText("Voting berlangsung")).toBeInTheDocument();
    await waitFor(() => expect(loadVoterInfo).toHaveBeenCalled());

    fireEvent.click(await screen.findByRole("button", { name: "Setujui" }));
    await waitFor(() => expect(approveWithdrawRequest).toHaveBeenCalledWith(expect.anything(), campaign().address, 0));
  });

  test("donatur yang masuk setelah permintaan dibuat tidak bisa memilih", async () => {
    loadVoterInfo.mockResolvedValueOnce({ vote: 0, canVote: false });
    renderWithStore(<WithdrawRequestCard request={withdrawRequest()} campaign={campaign()} isDonor />, {
      wallet: { account: DONOR },
    });

    expect(await screen.findByText(/Kamu berdonasi setelah permintaan ini dibuat/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Setujui" })).not.toBeInTheDocument();
  });

  test("bukan donatur hanya melihat keterangan", () => {
    renderWithStore(<WithdrawRequestCard request={withdrawRequest()} campaign={campaign()} isDonor={false} />, {
      wallet: { account: DONOR },
    });

    expect(screen.getByText("Hanya donatur kampanye ini yang bisa memberi suara")).toBeInTheDocument();
  });

  test("pembuat kampanye menarik dana setelah permintaan disetujui", async () => {
    renderWithStore(
      <WithdrawRequestCard
        request={withdrawRequest({ status: "Approved", approvalCount: 2 })}
        campaign={campaign()}
        isDonor={false}
        onChanged={jest.fn()}
      />,
      { wallet: { account: CREATOR } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Tarik Dana" }));
    await waitFor(() => expect(executeWithdrawRequest).toHaveBeenCalledWith(expect.anything(), campaign().address, 0));
  });

  test("permintaan yang belum disetujui belum bisa ditarik", () => {
    renderWithStore(<WithdrawRequestCard request={withdrawRequest()} campaign={campaign()} isDonor={false} />, {
      wallet: { account: CREATOR },
    });

    expect(screen.getByRole("button", { name: "Menunggu voting" })).toBeDisabled();
  });
});
