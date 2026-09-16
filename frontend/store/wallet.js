import { getAddress } from "ethers";
import { CHAIN_ID, IS_LOCAL_CHAIN } from "../lib/config";
import { getAdminAddress, getDevAccounts } from "../lib/contracts";

const WALLET_LOADED = "wallet/loaded";
const BLOCK_RECEIVED = "wallet/blockReceived";

/**
 * walletType: "metamask" | "dev" (tanpa MetaMask, akun Hardhat lokal) | null (tidak ada dompet)
 * chainId: jaringan aktif di MetaMask (untuk deteksi jaringan salah)
 */
const initialState = {
  isReady: false,
  walletType: null,
  account: null,
  chainId: null,
  adminAddress: null,
  blockNumber: 0,
};

export const walletReducer = (state = initialState, action) => {
  switch (action.type) {
    case WALLET_LOADED:
      return { ...state, ...action.payload, isReady: true };
    case BLOCK_RECEIVED:
      return { ...state, blockNumber: action.payload };
    default:
      return state;
  }
};

/** Alamat dalam format checksum (huruf besar/kecil konsisten) agar tampilan & perbandingan seragam */
const toChecksum = (address) => (address ? getAddress(address) : null);

const detectWallet = async () => {
  if (typeof window !== "undefined" && window.ethereum) {
    const [accounts, chainId] = await Promise.all([
      window.ethereum.request({ method: "eth_accounts" }),
      window.ethereum.request({ method: "eth_chainId" }),
    ]);
    return { walletType: "metamask", account: toChecksum(accounts[0]), chainId: parseInt(chainId, 16) };
  }
  if (IS_LOCAL_CHAIN) {
    const accounts = await getDevAccounts().catch(() => []);
    return { walletType: accounts.length ? "dev" : null, account: toChecksum(accounts[0]), chainId: CHAIN_ID };
  }
  return { walletType: null, account: null, chainId: null };
};

/** Baca ulang akun & jaringan dompet (dipanggil saat awal dan setelah menghubungkan dompet) */
export const loadWallet = () => async (dispatch) => {
  const [wallet, adminAddress] = await Promise.all([
    detectWallet().catch((error) => {
      console.error("Gagal membaca dompet:", error);
      return { walletType: null, account: null, chainId: null };
    }),
    getAdminAddress().catch(() => null),
  ]);
  dispatch({ type: WALLET_LOADED, payload: { ...wallet, adminAddress } });
};

export const blockReceived = (blockNumber) => ({ type: BLOCK_RECEIVED, payload: blockNumber });

export const selectAccount = (state) => state.wallet.account;
export const selectWallet = (state) => state.wallet;
export const selectBlockNumber = (state) => state.wallet.blockNumber;
export const selectIsWrongNetwork = (state) =>
  state.wallet.walletType === "metamask" && Boolean(state.wallet.account) && state.wallet.chainId !== CHAIN_ID;
