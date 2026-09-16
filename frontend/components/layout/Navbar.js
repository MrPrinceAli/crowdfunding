import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useWallet } from "../../hooks/useWallet";
import { MenuIcon, WalletIcon, XIcon } from "../ui/Icons";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";
import PreferenceControls from "./PreferenceControls";

const WalletStatus = ({ wallet }) => {
  const { t } = useI18n();
  const { label } = useIdentity([wallet.account]);
  if (!wallet.isReady) return null;

  if (!wallet.account) {
    return (
      <button className="btn-primary py-2" onClick={wallet.connect} disabled={wallet.isConnecting}>
        <WalletIcon className="h-4 w-4" />
        {wallet.isConnecting ? t("wallet.connecting") : t("wallet.connect")}
      </button>
    );
  }

  return (
    <Link
      href={`/creators/${wallet.account}`}
      className="text-body flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3.5 text-sm font-semibold hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-emerald-700"
      title={t("wallet.viewProfile")}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          wallet.isWrongNetwork
            ? "bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-500/20"
            : "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-500/20"
        }`}
      />
      <span className="max-w-[10rem] truncate">{label(wallet.account)}</span>
      {wallet.walletType === "dev" && <span className="badge-slate px-2 py-0.5">dev</span>}
      {wallet.isAdmin && <span className="badge-sky px-2 py-0.5">admin</span>}
    </Link>
  );
};

const Navbar = () => {
  const { t } = useI18n();
  const router = useRouter();
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: t("nav.explore") },
    { href: "/my-contributions", label: t("nav.contributions") },
    { href: "/stats", label: t("nav.stats") },
    ...(wallet.isAdmin ? [{ href: "/admin", label: t("nav.admin") }] : []),
  ];

  const linkClass = (href) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      router.pathname === href
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "text-body hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <PreferenceControls />
          {wallet.account && <NotificationBell />}
          <WalletStatus wallet={wallet} />
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          {wallet.account && <NotificationBell />}
          <button
            type="button"
            className="text-body rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-controls="mobile-menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="sr-only">{t("nav.openMenu")}</span>
            {menuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="divider border-t bg-white px-4 py-3 dark:bg-slate-950 lg:hidden" id="mobile-menu">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(link.href)}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="divider mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <PreferenceControls />
            <WalletStatus wallet={wallet} />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
