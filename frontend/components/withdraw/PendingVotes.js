import Link from "next/link";
import { useSelector } from "react-redux";
import { formatEth, formatTimeLeft, shortAddress } from "../../lib/format";
import { selectCampaigns } from "../../store/campaigns";
import { useI18n } from "../providers/PreferencesProvider";
import IdrValue from "../ui/IdrValue";
import { ClockIcon } from "../ui/Icons";

/** Permintaan penarikan dari kampanye yang didukung, yang masih menunggu suara akun ini */
const PendingVotes = ({ requests }) => {
  const { t } = useI18n();
  const campaigns = useSelector(selectCampaigns);

  if (!requests?.length) return null;

  return (
    <div className="notice-amber mb-10 rounded-2xl p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
        </span>
        <h2 className="text-strong font-bold">{t("pendingVotes.title")}</h2>
        <span className="badge-amber">{requests.length}</span>
      </div>
      <p className="text-body mt-1 text-sm">{t("pendingVotes.description")}</p>

      <div className="mt-4 space-y-2">
        {requests.map((request) => {
          const campaign = campaigns?.find((item) => item.address === request.campaignAddress);
          return (
            <Link
              key={`${request.campaignAddress}-${request.id}`}
              href={`/project-details/${request.campaignAddress}`}
              className="flex flex-col gap-2 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-muted truncate text-xs font-medium">
                  {campaign?.title ?? shortAddress(request.campaignAddress)}
                </p>
                <p className="text-strong truncate font-semibold">{request.description}</p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <div className="text-right">
                  <p className="text-strong font-bold">{formatEth(request.amount)}</p>
                  <IdrValue eth={request.amount} />
                </div>
                <span className="flex items-center gap-1 whitespace-nowrap text-xs text-amber-700 dark:text-amber-300">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {formatTimeLeft(request.votingDeadline)}
                </span>
                <span className="btn-primary px-4 py-2 text-xs">{t("pendingVotes.vote")}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default PendingVotes;
