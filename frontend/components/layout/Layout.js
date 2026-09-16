import Footer from "./Footer";
import Navbar from "./Navbar";
import NetworkBanner from "./NetworkBanner";

const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col">
    <Navbar />
    <NetworkBanner />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default Layout;
