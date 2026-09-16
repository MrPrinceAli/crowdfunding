import Link from "next/link";
import { HandsIcon } from "../ui/Icons";

const Logo = ({ href = "/dashboard" }) => (
  <Link href={href} className="flex items-center gap-2.5">
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
      <HandsIcon className="h-5 w-5" />
    </span>
    <span className="text-strong text-lg font-extrabold tracking-tight">
      Crowd<span className="text-accent">funding</span>
    </span>
  </Link>
);

export default Logo;
