import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useSelector } from "react-redux";
import { shortAddress } from "../../lib/format";
import { selectAccount } from "../../store/wallet";
import { MenuIcon, XIcon } from "../ui/Icons";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/dashboard", label: "Jelajahi Kampanye" },
  { href: "/my-contributions", label: "Kontribusi Saya" },
];

const WalletPill = ({ account }) => (
  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3.5 text-sm font-semibold text-slate-700">
    <span
      className={`h-2.5 w-2.5 rounded-full ${account ? "bg-emerald-500 ring-4 ring-emerald-100" : "bg-slate-300"}`}
    />
    {account ? shortAddress(account) : "Belum terhubung"}
  </div>
);

const Navbar = () => {
  const router = useRouter();
  const account = useSelector(selectAccount);
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (href) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition ${
      router.pathname === href
        ? "bg-emerald-50 text-emerald-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={linkClass(link.href)}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:block">
          <WalletPill account={account} />
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="sr-only">Buka menu</span>
          {menuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden" id="mobile-menu">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
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
          <div className="mt-3 border-t border-slate-100 pt-3">
            <WalletPill account={account} />
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
