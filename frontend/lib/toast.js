import { toast } from "react-toastify";
import { translate } from "./i18n";

export const toastSuccess = (message) => toast.success(message);

export const toastError = (message) => toast.error(message);

/** Ambil pesan yang bisa dibaca dari error MetaMask / ethers / contract revert */
export const getErrorMessage = (error) => {
  if (!error) return translate("error.generic");
  if (error.code === 4001 || error.code === "ACTION_REJECTED") return translate("error.rejected");
  // ethers v6: alasan revert contract ada di `reason`
  if (error.reason) return translate("error.reverted", { reason: error.reason });

  const message = error.shortMessage || error.data?.message || error.message || String(error);
  const reverted =
    message.match(/reverted with reason string '([^']+)'/) || message.match(/revert(?:ed)?:?\s*([^"\n]+)/);
  if (reverted) return translate("error.reverted", { reason: reverted[1].trim() });
  if (/denied|rejected/i.test(message)) return translate("error.rejected");
  return message;
};
