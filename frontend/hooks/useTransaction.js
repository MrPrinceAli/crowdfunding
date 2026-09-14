import { useState } from "react";
import { getErrorMessage, toastError, toastSuccess } from "../lib/toast";

/**
 * Menjalankan transaksi blockchain dengan status loading & notifikasi.
 * `run(key, action, successMessage)` mengembalikan hasil action, atau undefined jika gagal.
 */
export const useTransaction = () => {
  const [pendingKey, setPendingKey] = useState(null);

  const run = async (key, action, successMessage) => {
    setPendingKey(key);
    try {
      const result = await action();
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
