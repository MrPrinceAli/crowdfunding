import Link from "next/link";
import { HeartIcon } from "../ui/Icons";

const Logo = ({ href = "/dashboard" }) => (
  <Link href={href} className="flex items-center gap-2.5">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
      <HeartIcon className="h-5 w-5" />
    </span>
    <span className="text-lg font-extrabold tracking-tight text-slate-900">
      Crowd<span className="text-emerald-600">funding</span>
    </span>
  </Link>
);

export default Logo;
