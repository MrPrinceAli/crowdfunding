import Link from "next/link";
import { campaignStatus, daysLeft, isBeforeDeadline } from "../../lib/campaign";
import { formatDate, formatEth } from "../../lib/format";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import FavoriteButton from "../ui/FavoriteButton";
import IdrValue from "../ui/IdrValue";
import { ClockIcon, MapPinIcon } from "../ui/Icons";
import VerifiedBadge from "../ui/VerifiedBadge";
import CampaignCover from "./CampaignCover";

/** Kartu ringkas kampanye untuk tampilan grid */
const CampaignCard = ({ campaign, isMine }) => {
  const { t } = useI18n();
  const { label } = useIdentity([campaign.creator]);
  const status = campaignStatus(campaign);
  const progress = Math.min(campaign.progress, 100);

  return (
    <Link
      href={`/project-details/${campaign.address}`}
      className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <CampaignCover address={campaign.address} imageUrl={campaign.imageUrl}>
        <div className="absolute left-4 right-14 top-4 flex flex-wrap gap-2">
          <span className={status.className}>{t(`status.${status.key}`)}</span>
          {campaign.isVerified && <VerifiedBadge />}
          {isMine && <span className="badge-overlay">{t("campaign.mine")}</span>}
          {campaign.activeVotingCount > 0 && (
            <span className="badge-amber gap-1">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
              {campaign.activeVotingCount > 1
                ? t("campaign.votingCount", { count: campaign.activeVotingCount })
                : t("campaign.voting")}
            </span>
          )}
          {campaign.reportCount > 0 && (
            <span className="badge-rose">⚠ {t("moderation.reportedTimes", { count: campaign.reportCount })}</span>
          )}
        </div>
        <FavoriteButton address={campaign.address} className="absolute right-4 top-3" />
      </CampaignCover>

      <div className="flex flex-1 flex-col p-5">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
          <span className="text-accent uppercase tracking-wide">{t(`category.${campaign.category}`)}</span>
          {campaign.location && (
            <span className="text-muted inline-flex items-center gap-1 font-medium">
              <MapPinIcon className="h-3.5 w-3.5" />
              {t(`province.${campaign.location}`)}
            </span>
          )}
        </p>
        <h3 className="text-strong mt-1 line-clamp-2 text-lg font-bold leading-snug group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
          {campaign.title}
        </h3>
        <p className="text-muted mt-2 line-clamp-2 text-sm">{campaign.description}</p>
        <p className="text-faint mt-3 text-xs font-medium">{t("campaign.by", { address: label(campaign.creator) })}</p>

        <div className="mt-auto pt-5">
          <div className="progress-track">
            <div className="progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-strong text-base font-bold">{formatEth(campaign.raisedAmount)}</p>
              <p className="text-muted text-xs">{t("campaign.raisedOf", { goal: formatEth(campaign.goalAmount) })}</p>
              <IdrValue eth={campaign.raisedAmount} className="text-faint block text-xs" />
            </div>
            <div className="text-right">
              <p className="text-accent text-base font-bold">{campaign.progress}%</p>
              <p className="text-muted flex items-center justify-end gap-1 text-xs">
                <ClockIcon className="h-3.5 w-3.5" />
                {isBeforeDeadline(campaign.deadline)
                  ? t("campaign.daysLeft", { days: daysLeft(campaign.deadline) })
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
