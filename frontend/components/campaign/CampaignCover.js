import { coverGradient } from "../../lib/campaign";
import { HeartIcon } from "../ui/Icons";

/** Cover bergradasi yang warnanya konsisten per alamat kampanye */
const CampaignCover = ({ address, className = "h-36", iconClassName = "-bottom-6 -right-4 h-32 w-32", children }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br ${coverGradient(address)} ${className}`}>
    <div className="bg-grid absolute inset-0 opacity-40" />
    <HeartIcon className={`absolute text-white/20 transition duration-500 group-hover:scale-110 ${iconClassName}`} />
    {children}
  </div>
);

export default CampaignCover;
