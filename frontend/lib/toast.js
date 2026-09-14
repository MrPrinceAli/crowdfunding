import { toast } from "react-toastify";

export const toastSuccess = (message) => toast.success(message);

export const toastError = (message) => toast.error(message);

/** Ambil pesan yang bisa dibaca dari error MetaMask / web3 / contract revert */
export const getErrorMessage = (error) => {
  if (!error) return "Terjadi kesalahan";
  if (error.code === 4001) return "Transaksi dibatalkan di MetaMask";

  const message = error.data?.message || error.message || String(error);
  const reverted =
    message.match(/reverted with reason string '([^']+)'/) || message.match(/revert(?:ed)?:?\s*([^"\n]+)/);
  if (reverted) return `Transaksi ditolak contract: ${reverted[1].trim()}`;
  if (/denied|rejected/i.test(message)) return "Transaksi dibatalkan di MetaMask";
  return message;
};
