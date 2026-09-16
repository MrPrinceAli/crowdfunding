import { useSelector } from "react-redux";
import { useWallet } from "../../hooks/useWallet";
import { NETWORK_NAME, RPC_URL } from "../../lib/config";
import { selectCampaignsError } from "../../store/campaigns";
import { useI18n } from "../providers/PreferencesProvider";

const Banner = ({ tone, children, action }) => (
  <div
    className={
      tone === "error"
        ? "bg-rose-600 text-white"
        : "bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
    }
  >
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-2.5 text-sm sm:flex-row sm:px-6 lg:px-8">
      <p className="text-center sm:text-left">{children}</p>
      {action}
    </div>
  </div>
);

/** Peringatan koneksi: blockchain tidak bisa dihubungi, jaringan MetaMask salah, atau MetaMask tidak ada */
const NetworkBanner = () => {
  const { t } = useI18n();
  const wallet = useWallet();
  const campaignsError = useSelector(selectCampaignsError);

  if (campaignsError) {
    return <Banner tone="error">{t("banner.rpcError", { url: RPC_URL })}</Banner>;
  }

  if (wallet.isWrongNetwork) {
    return (
      <Banner
        action={
          <button className="btn bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700" onClick={wallet.switchNetwork}>
            {t("banner.switchTo", { network: NETWORK_NAME })}
          </button>
        }
      >
        {t("banner.wrongNetwork", { network: NETWORK_NAME })}
      </Banner>
    );
  }

  if (wallet.isReady && !wallet.walletType) {
    return (
      <Banner
        action={
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-amber-600 px-3 py-1.5 text-white hover:bg-amber-700"
          >
            {t("banner.installMetaMask")}
          </a>
        }
      >
        {t("banner.noMetaMask")}
      </Banner>
    );
  }

  return null;
};

export default NetworkBanner;
