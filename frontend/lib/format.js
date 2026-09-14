import Web3 from "web3";

export const weiToEther = (wei) => Web3.utils.fromWei(String(wei ?? 0), "ether");

export const etherToWei = (ether) => Web3.utils.toWei(String(ether), "ether");

export const nowInSeconds = () => Math.floor(Date.now() / 1000);

export const formatEth = (value) => `${Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 4 })} ETH`;

/** UNIX timestamp (detik) -> "DD/MM/YYYY" */
export const formatDate = (seconds) => {
  const date = new Date(Number(seconds) * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

/** Sisa waktu sampai timestamp (detik), mis. "2 hari 3 jam" */
export const formatTimeLeft = (targetSeconds, now = nowInSeconds()) => {
  const diff = Math.max(0, targetSeconds - now);
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (days > 0) return `${days} hari ${hours} jam`;
  if (hours > 0) return `${hours} jam ${minutes} menit`;
  return `${Math.max(1, minutes)} menit`;
};

export const shortAddress = (address = "") => (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "");

export const sameAddress = (a, b) => Boolean(a && b) && a.toLowerCase() === b.toLowerCase();
