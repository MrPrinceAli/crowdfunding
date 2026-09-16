import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import CrowdfundingAbi from "../abi/Crowdfunding.json";
import ProjectAbi from "../abi/Project.json";
import { CHAIN_ID, CROWDFUNDING_ADDRESS, IS_LOCAL_CHAIN, RPC_URL } from "../config";
import { translate } from "../i18n";

// ---------------------------------------------------------------------------
// Koneksi ke blockchain & helper yang dipakai semua modul lib/chain
// ---------------------------------------------------------------------------

let readProvider;

/**
 * Provider untuk membaca data langsung dari RPC. Tidak bergantung pada MetaMask,
 * sehingga kampanye tetap tampil walaupun dompet belum terhubung atau berada di jaringan lain.
 */
export const getReadProvider = () => {
  if (!readProvider) {
    readProvider = new JsonRpcProvider(RPC_URL, CHAIN_ID, { staticNetwork: true, pollingInterval: 2000 });
  }
  return readProvider;
};

/** Signer untuk mengirim transaksi: MetaMask, atau akun Hardhat yang tidak terkunci di mode dev lokal */
export const getSigner = async (account) => {
  if (typeof window !== "undefined" && window.ethereum) {
    return new BrowserProvider(window.ethereum).getSigner(account);
  }
  if (IS_LOCAL_CHAIN) return getReadProvider().getSigner(account);
  throw new Error(translate("wallet.notFound"));
};

/** Akun Hardhat yang tidak terkunci (hanya untuk mode dev tanpa MetaMask) */
export const getDevAccounts = () => getReadProvider().send("eth_accounts", []);

export const crowdfunding = (runner = getReadProvider()) => new Contract(CROWDFUNDING_ADDRESS, CrowdfundingAbi, runner);

export const project = (address, runner = getReadProvider()) => new Contract(address, ProjectAbi, runner);

/** Kirim transaksi dan tunggu sampai masuk blok */
export const send = async (txPromise) => (await txPromise).wait();

export const blockTimestamp = async (blockNumber) => (await getReadProvider().getBlock(blockNumber)).timestamp;

/** Timestamp untuk banyak event sekaligus (satu permintaan per blok) */
export const blockTimestamps = async (events) => {
  const blocks = [...new Set(events.map((event) => event.blockNumber))];
  const times = await Promise.all(blocks.map(blockTimestamp));
  return new Map(blocks.map((block, index) => [block, times[index]]));
};
