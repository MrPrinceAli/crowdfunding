import { createWeb3, getAccount } from "../lib/contracts";
import { loadAllCampaigns } from "./campaigns";

const WALLET_LOADED = "wallet/loaded";

const initialState = { web3: null, account: null, isReady: false };

export const walletReducer = (state = initialState, action) => {
  switch (action.type) {
    case WALLET_LOADED:
      return { ...state, ...action.payload, isReady: true };
    default:
      return state;
  }
};

/** Hubungkan web3 (MetaMask atau RPC), baca akun aktif, lalu muat semua kampanye */
export const initBlockchain = () => async (dispatch) => {
  const web3 = createWeb3();
  try {
    const account = await getAccount(web3);
    dispatch({ type: WALLET_LOADED, payload: { web3, account } });
    await dispatch(loadAllCampaigns());
  } catch (error) {
    // Biasanya MetaMask terkunci, node belum berjalan, atau jaringan salah
    console.error("Gagal memuat blockchain:", error);
    dispatch({ type: WALLET_LOADED, payload: { web3, account: null } });
  }
};

export const selectWeb3 = (state) => state.wallet.web3;
export const selectAccount = (state) => state.wallet.account;
