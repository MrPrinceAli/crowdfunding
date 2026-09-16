import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { applyMiddleware, combineReducers, legacy_createStore as createStore } from "redux";
import { thunk } from "redux-thunk";
import { campaignsReducer } from "../../store/campaigns";
import { walletReducer } from "../../store/wallet";

/** Render komponen dengan store Redux berisi kondisi dompet tertentu */
export const renderWithStore = (ui, { wallet = {}, campaigns = null } = {}) => {
  const store = createStore(
    combineReducers({ wallet: walletReducer, campaigns: campaignsReducer }),
    {
      wallet: {
        isReady: true,
        walletType: "metamask",
        account: null,
        chainId: 31337,
        adminAddress: null,
        blockNumber: 0,
        ...wallet,
      },
      campaigns: { list: campaigns, error: null },
    },
    applyMiddleware(thunk),
  );
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
};

export const CREATOR = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
export const DONOR = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

export const campaign = (overrides = {}) => ({
  address: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
  creator: CREATOR,
  title: "Beasiswa untuk 50 anak",
  description: "Bantu biaya sekolah anak-anak di desa terpencil.",
  category: "Pendidikan",
  location: "Nusa Tenggara Timur",
  imageUrl: "",
  minContribution: 0.1,
  goalAmount: 10,
  raisedAmount: 6.5,
  balance: 6.5,
  withdrawnAmount: 0,
  pendingWithdrawAmount: 0,
  state: "Fundraising",
  deadline: Math.floor(Date.now() / 1000) + 10 * 86400,
  progress: 65,
  contributorCount: 2,
  updateCount: 0,
  abandonedAt: Math.floor(Date.now() / 1000) + 40 * 86400,
  isAbandoned: false,
  isRefundOpen: false,
  isCancelled: false,
  cancelledByAdmin: false,
  closedEarly: false,
  isTakenDown: false,
  takenDownAt: 0,
  appealStatus: "None",
  deadlineExtended: false,
  isVerified: false,
  reportCount: 0,
  activeVotingCount: 0,
  ...overrides,
});

export const withdrawRequest = (overrides = {}) => ({
  id: 0,
  description: "Pembelian 50 paket buku",
  amount: 1,
  recipient: CREATOR,
  approvalCount: 0,
  rejectionCount: 0,
  votingDeadline: Math.floor(Date.now() / 1000) + 2 * 86400,
  eligibleVoterCount: 2,
  isCompleted: false,
  isCancelled: false,
  status: "Voting",
  ...overrides,
});
