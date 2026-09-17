import { Head, Html, Main, NextScript } from "next/document";
import { THEME_INIT_SCRIPT } from "../lib/preferences";

const Document = () => (
  <Html lang="id" suppressHydrationWarning>
    <Head>
      <meta name="description" content="Himpun — platform galang dana transparan berbasis smart contract" />
      <meta name="theme-color" content="#059669" />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Himpun" />
      <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      <link rel="alternate icon" href="/favicon.ico" />
      {/* Terapkan tema gelap sebelum halaman tampil agar tidak berkedip */}
      <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
    </Head>
    <body>
      <Main />
      <NextScript />
    </body>
  </Html>
);

export default Document;
