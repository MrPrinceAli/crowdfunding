import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { translate } from "../lib/i18n";
import { getErrorMessage, toastError } from "../lib/toast";
import { connectWallet, switchToTargetNetwork } from "../lib/wallet";
import { loadWallet, selectIsWrongNetwork, selectWallet } from "../store/wallet";
import { sameAddress } from "../lib/format";

/** Status dompet + aksi menghubungkan dompet & pindah jaringan */
export const useWallet = () => {
  const dispatch = useDispatch();
  const wallet = useSelector(selectWallet);
  const isWrongNetwork = useSelector(selectIsWrongNetwork);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = async () => {
    setIsConnecting(true);
    try {
      await connectWallet();
      await dispatch(loadWallet());
      return true;
    } catch (error) {
      toastError(translate("wallet.connectFailed", { message: getErrorMessage(error) }));
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await switchToTargetNetwork();
      await dispatch(loadWallet());
    } catch (error) {
      toastError(getErrorMessage(error));
    }
  };

  return {
    ...wallet,
    isWrongNetwork,
    isAdmin: sameAddress(wallet.account, wallet.adminAddress),
    isConnecting,
    connect,
    switchNetwork,
  };
};
