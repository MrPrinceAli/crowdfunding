import "../styles/globals.css";
import "nprogress/nprogress.css";
import "react-toastify/dist/ReactToastify.css";

import { Plus_Jakarta_Sans } from "next/font/google";
import Router from "next/router";
import NProgress from "nprogress";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import Layout from "../components/layout/Layout";
import { reloadOnWalletChange } from "../lib/wallet";
import { store } from "../store";
import { initBlockchain } from "../store/wallet";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const App = ({ Component, pageProps }) => {
  useEffect(() => {
    store.dispatch(initBlockchain());
    return reloadOnWalletChange();
  }, []);

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

  // Halaman bisa menonaktifkan navbar/footer dengan `Page.withLayout = false`
  const page = <Component {...pageProps} />;

  return (
    <Provider store={store}>
      <style jsx global>{`
        :root {
          --font-jakarta: ${jakarta.style.fontFamily};
        }
      `}</style>
      <ToastContainer position="top-right" autoClose={5000} />
      {Component.withLayout === false ? page : <Layout>{page}</Layout>}
    </Provider>
  );
};

export default App;
