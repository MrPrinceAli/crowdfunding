import { Head, Html, Main, NextScript } from "next/document";

const Document = () => (
  <Html lang="id">
    <Head>
      <meta name="description" content="Platform galang dana transparan berbasis smart contract" />
      <meta name="theme-color" content="#059669" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Crowdfunding DApp" />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
