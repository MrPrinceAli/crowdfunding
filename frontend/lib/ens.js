import { JsonRpcProvider } from "ethers";
import { ENS_RPC_URL } from "./config";

// Nama ENS hanya ada di Ethereum mainnet, jadi dibaca lewat RPC mainnet terpisah dari jaringan aplikasi
const CACHE_KEY = "crowdfunding-ens";
const TIMEOUT_MS = 5000;

let provider;
const getProvider = () => {
  if (!provider) provider = new JsonRpcProvider(ENS_RPC_URL, 1, { staticNetwork: true });
  return provider;
};

const withTimeout = (promise) =>
  Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS))]);

export const isEnsEnabled = () => Boolean(ENS_RPC_URL);

/** Cache per sesi browser: { alamatHurufKecil: { name, avatar } | null } */
export const readEnsCache = () => {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || {};
  } catch {
    return {};
  }
};

export const writeEnsCache = (cache) => {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage diblokir: cache hanya di memori
  }
};

/** Reverse lookup ENS untuk satu alamat; null jika tidak punya nama atau gagal */
export const lookupEns = async (address) => {
  if (!isEnsEnabled()) return null;
  try {
    const name = await withTimeout(getProvider().lookupAddress(address));
    if (!name) return null;
    const avatar = await withTimeout(getProvider().getAvatar(name)).catch(() => null);
    return { name, avatar: avatar || null };
  } catch {
    return null;
  }
};
