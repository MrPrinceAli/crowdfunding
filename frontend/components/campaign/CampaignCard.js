import Link from "next/link";
import { campaignStatus, daysLeft, isBeforeDeadline } from "../../lib/campaign";
import { formatDate, formatEth, shortAddress } from "../../lib/format";
import IdrValue from "../ui/IdrValue";
import { ClockIcon } from "../ui/Icons";
import CampaignCover from "./CampaignCover";

/** Kartu ringkas kampanye untuk tampilan grid */
const CampaignCard = ({ campaign, isMine }) => {
  const status = campaignStatus(campaign);
  const progress = Math.min(campaign.progress, 100);

  return (
    <Link
      href={`/project-details/${campaign.address}`}
      className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <CampaignCover address={campaign.address}>
        <div className="absolute left-4 right-4 top-4 flex flex-wrap gap-2">
          <span className={`badge ${status.className}`}>{status.label}</span>
          {isMine && <span className="badge bg-white/90 text-slate-700">Kampanye saya</span>}
          {campaign.activeVotingCount > 0 && (
            <span className="badge gap-1 bg-amber-100 text-amber-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              Ada voting{campaign.activeVotingCount > 1 ? ` (${campaign.activeVotingCount})` : ""}
            </span>
          )}
        </div>
      </CampaignCover>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-slate-900 group-hover:text-emerald-700">
          {campaign.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-slate-500">{campaign.description}</p>
        <p className="mt-3 text-xs font-medium text-slate-400">oleh {shortAddress(campaign.creator)}</p>

        <div className="mt-auto pt-5">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-base font-bold text-slate-900">{formatEth(campaign.raisedAmount)}</p>
              <p className="text-xs text-slate-500">terkumpul dari {formatEth(campaign.goalAmount)}</p>
              <IdrValue eth={campaign.raisedAmount} className="block text-xs text-slate-400" />
            </div>
            <div className="text-right">
              <p className="text-base font-bold text-emerald-600">{campaign.progress}%</p>
              <p className="flex items-center justify-end gap-1 text-xs text-slate-500">
                <ClockIcon className="h-3.5 w-3.5" />
                {isBeforeDeadline(campaign.deadline)
                  ? `${daysLeft(campaign.deadline)} hari lagi`
                  : formatDate(campaign.deadline)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CampaignCard;
