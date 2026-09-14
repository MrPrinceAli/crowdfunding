import { CHAIN_ID, NETWORK_NAME, RPC_URL } from "./config";

const TARGET_CHAIN = {
  chainId: `0x${CHAIN_ID.toString(16)}`,
  chainName: NETWORK_NAME,
  rpcUrls: [RPC_URL],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
};

/** Pindahkan MetaMask ke jaringan tujuan, tambahkan jaringannya jika belum ada */
export const switchToTargetNetwork = async () => {
  const currentChainId = await window.ethereum.request({ method: "eth_chainId" });
  if (currentChainId === TARGET_CHAIN.chainId) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: TARGET_CHAIN.chainId }],
    });
  } catch (error) {
    // 4902 = jaringan belum terdaftar di MetaMask
    if (error.code !== 4902) throw error;
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [TARGET_CHAIN] });
  }
};

/** Minta akses akun MetaMask dan pastikan berada di jaringan yang benar */
export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("MetaMask tidak ditemukan. Pasang ekstensi MetaMask terlebih dahulu.");
  }
  await window.ethereum.request({ method: "eth_requestAccounts" });
  await switchToTargetNetwork();
};

/** Muat ulang halaman saat akun atau jaringan MetaMask berganti */
export const reloadOnWalletChange = () => {
  if (!window.ethereum) return () => {};
  const reload = () => window.location.reload();
  window.ethereum.on("accountsChanged", reload);
  window.ethereum.on("chainChanged", reload);
  return () => {
    window.ethereum.removeListener("accountsChanged", reload);
    window.ethereum.removeListener("chainChanged", reload);
  };
};
