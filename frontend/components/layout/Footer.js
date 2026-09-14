import { HeartIcon } from "../ui/Icons";

const Footer = () => (
  <footer className="mt-20 border-t border-slate-200 bg-white">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 font-semibold text-slate-700">
        <HeartIcon className="h-4 w-4 text-emerald-600" />
        Crowdfunding
      </div>
      <p>Galang dana transparan, dijalankan oleh smart contract Ethereum.</p>
    </div>
  </footer>
);

export default Footer;
