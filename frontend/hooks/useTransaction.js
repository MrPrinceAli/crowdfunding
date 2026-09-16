import { useState } from "react";
import { useSelector } from "react-redux";
import { getSigner } from "../lib/contracts";
import { translate } from "../lib/i18n";
import { getErrorMessage, toastError, toastSuccess } from "../lib/toast";
import { switchToTargetNetwork } from "../lib/wallet";
import { selectIsWrongNetwork, selectWallet } from "../store/wallet";

/**
 * Menjalankan transaksi blockchain dengan status loading & notifikasi.
 * `run(key, (signer) => ..., successMessage)` memastikan dompet terhubung dan di jaringan yang benar,
 * lalu mengembalikan hasil action (atau undefined jika gagal).
 */
export const useTransaction = () => {
  const { account } = useSelector(selectWallet);
  const isWrongNetwork = useSelector(selectIsWrongNetwork);
  const [pendingKey, setPendingKey] = useState(null);

  const run = async (key, action, successMessage) => {
    if (!account) {
      toastError(translate("wallet.connectFirst"));
      return undefined;
    }

    setPendingKey(key);
    try {
      if (isWrongNetwork) await switchToTargetNetwork();
      const result = await action(await getSigner(account));
      if (successMessage) toastSuccess(successMessage);
      return result ?? true;
    } catch (error) {
      toastError(getErrorMessage(error));
      return undefined;
    } finally {
      setPendingKey(null);
    }
  };

  return { run, isPending: (key) => pendingKey === key, isBusy: pendingKey !== null };
};
