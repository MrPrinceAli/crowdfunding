import "../styles/globals.css";
import "../styles/landing.css";
import "nprogress/nprogress.css";
import "react-toastify/dist/ReactToastify.css";
import "lenis/dist/lenis.css";

import { Plus_Jakarta_Sans } from "next/font/google";
import Router from "next/router";
import NProgress from "nprogress";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import Layout from "../components/layout/Layout";
import { IdentityProvider } from "../components/providers/IdentityProvider";
import { PreferencesProvider } from "../components/providers/PreferencesProvider";
import { getReadProvider } from "../lib/contracts";
import { reloadOnWalletChange } from "../lib/wallet";
import { store } from "../store";
import { loadAllCampaigns } from "../store/campaigns";
import { blockReceived, loadWallet } from "../store/wallet";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const CAMPAIGNS_REFRESH_MS = 3000;

const useBlockchain = () => {
  useEffect(() => {
    store.dispatch(loadWallet());
    store.dispatch(loadAllCampaigns());

    // Real-time: setiap blok baru (transaksi dari siapa pun) data kampanye diperbarui, maksimal tiap 3 detik
    let lastRefresh = 0;
    let timer;
    const onBlock = (blockNumber) => {
      store.dispatch(blockReceived(blockNumber));
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          lastRefresh = Date.now();
          store.dispatch(loadAllCampaigns());
        },
        Math.max(0, lastRefresh + CAMPAIGNS_REFRESH_MS - Date.now()),
      );
    };
    const provider = getReadProvider();
    provider.on("block", onBlock);

    const stopWalletListener = reloadOnWalletChange();
    return () => {
      clearTimeout(timer);
      provider.off("block", onBlock);
      stopWalletListener();
    };
  }, []);
};

const useRouteProgress = () => {
  useEffect(() => {
    const start = () => NProgress.start();
    const done = () => NProgress.done();
    Router.events.on("routeChangeStart", start);
    Router.events.on("routeChangeComplete", done);
    Router.events.on("routeChangeError", done);
    return () => {
      Router.events.off("routeChangeStart", start);
      Router.events.off("routeChangeComplete", done);
      Router.events.off("routeChangeError", done);
    };
  }, []);
};

const App = ({ Component, pageProps }) => {
  useBlockchain();
  useRouteProgress();

  // Halaman bisa menonaktifkan navbar/footer dengan `Page.withLayout = false`
  const page = <Component {...pageProps} />;

  return (
    <Provider store={store}>
      <PreferencesProvider>
        <IdentityProvider>
          <style jsx global>{`
            :root {
              --font-jakarta: ${jakarta.style.fontFamily};
            }
          `}</style>
          <ToastContainer position="top-right" autoClose={5000} theme="colored" />
          {Component.withLayout === false ? page : <Layout>{page}</Layout>}
        </IdentityProvider>
      </PreferencesProvider>
    </Provider>
  );
};

export default App;
