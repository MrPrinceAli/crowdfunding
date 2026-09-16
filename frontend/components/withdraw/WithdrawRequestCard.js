import { useEffect, useState } from "react";
import { useNow } from "../../hooks/useNow";
import { useTransaction } from "../../hooks/useTransaction";
import { useWallet } from "../../hooks/useWallet";
import { evaluateWithdrawRequest, majorityVotes, quorumVotes, VOTE } from "../../lib/campaign";
import { EXPLORER_URL } from "../../lib/config";
import {
  approveWithdrawRequest,
  cancelWithdrawRequest,
  executeWithdrawRequest,
  loadVoterInfo,
  rejectWithdrawRequest,
} from "../../lib/contracts";
import { formatDate, formatEth, formatTimeLeft, sameAddress, shortAddress } from "../../lib/format";
import { toastSuccess } from "../../lib/toast";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import IdrValue from "../ui/IdrValue";
import { CheckIcon, ClockIcon, XIcon } from "../ui/Icons";

const STATUS_STYLE = {
  Voting: { badge: "badge-amber", icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" },
  Approved: {
    badge: "badge-emerald",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  Rejected: { badge: "badge-rose", icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" },
  Completed: {
    badge: "badge-emerald",
    icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  Cancelled: { badge: "badge-slate", icon: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
};

const StatusIcon = ({ status }) => {
  if (status === "Completed" || status === "Approved") return <CheckIcon />;
  if (status === "Voting") return <ClockIcon />;
  return <XIcon />;
};

const VoteProgress = ({ request, status, reason, now }) => {
  const { t } = useI18n();
  const voters = request.eligibleVoterCount;
  const percent = (count) => (voters ? (count / voters) * 100 : 0);

  return (
    <div className="mt-3 max-w-sm">
      <div className="flex flex-wrap justify-between gap-x-3 text-xs">
        <span className="text-body font-semibold">
          <span className="text-accent">{t("withdraw.approvals", { count: request.approvalCount })}</span> ·{" "}
          <span className="text-rose-600 dark:text-rose-400">
            {t("withdraw.rejections", { count: request.rejectionCount })}
          </span>
        </span>
        <span className="text-faint" title={t("withdraw.votersTooltip")}>
          {t("withdraw.ofVoters", { count: voters })}
        </span>
      </div>
      <div className="progress-track mt-1.5 flex h-1.5">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent(request.approvalCount)}%` }} />
        <div className="h-full bg-rose-400 transition-all" style={{ width: `${percent(request.rejectionCount)}%` }} />
      </div>
      <p className="text-muted mt-1.5 text-xs">
        {status === "Voting"
          ? t("withdraw.votingRules", {
              time: formatTimeLeft(request.votingDeadline, now),
              majority: majorityVotes(voters),
              quorum: quorumVotes(voters),
            })
          : reason
            ? t(`withdraw.reason.${reason}`)
            : t("withdraw.statusFromChain")}
      </p>
    </div>
  );
};

const CompletionProof = ({ request }) => {
  const { t } = useI18n();
  return (
    <p className="text-faint mt-1 flex flex-wrap items-center gap-x-1.5 text-xs">
      <span>{t("withdraw.approvedBy", { count: request.approvalCount })}</span>
      {request.completedAt && <span>· {t("withdraw.withdrawnOn", { date: formatDate(request.completedAt) })}</span>}
      {request.txHash &&
        (EXPLORER_URL ? (
          <a
            href={`${EXPLORER_URL}/tx/${request.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent font-mono hover:underline"
          >
            · tx {shortAddress(request.txHash)} ↗
          </a>
        ) : (
          <button
            type="button"
            className="text-muted font-mono hover:text-emerald-600"
            title={t("withdraw.copyTx")}
            onClick={() => {
              navigator.clipboard?.writeText(request.txHash);
              toastSuccess(t("withdraw.txCopied"));
            }}
          >
            · tx {shortAddress(request.txHash)}
          </button>
        ))}
    </p>
  );
};

const WithdrawRequestCard = ({ request, campaign, isDonor, onChanged }) => {
  const { t } = useI18n();
  const { label } = useIdentity([request.recipient]);
  const wallet = useWallet();
  const now = useNow();
  const { run, isPending, isBusy } = useTransaction();
  const [voter, setVoter] = useState({ vote: VOTE.None, canVote: false });

  // Status resmi dari contract (getRequestStatus); perhitungan lokal hanya untuk teks penjelasan
  const local = evaluateWithdrawRequest(request, now);
  const status = request.status || local.status;
  const reason = local.status === status ? local.reason : null;
  const style = STATUS_STYLE[status];
  const isCreator = sameAddress(wallet.account, campaign.creator);
  const isOpen = ["Voting", "Approved", "Rejected"].includes(status);

  useEffect(() => {
    if (!wallet.account || !isDonor || isCreator) return;
    loadVoterInfo(campaign.address, request.id, wallet.account)
      .then(setVoter)
      .catch(() => setVoter({ vote: VOTE.None, canVote: false }));
  }, [wallet.account, isDonor, isCreator, campaign.address, request.id, request.approvalCount, request.rejectionCount]);

  const act = async (key, action, message) => {
    const success = await run(key, (signer) => action(signer, campaign.address, request.id), message);
    if (success) onChanged?.();
  };

  const note = (text) => <span className="text-faint text-xs sm:w-40 sm:text-right">{text}</span>;

  const renderActions = () => {
    if (status === "Completed") return <span className="text-accent text-sm font-semibold">{t("withdraw.done")}</span>;
    if (status === "Cancelled") return null;

    if (isCreator) {
      return (
        <div className="flex gap-2 sm:flex-col">
          {status !== "Rejected" && (
            <button
              className="btn-primary flex-1 sm:w-40"
              disabled={status !== "Approved" || isBusy || campaign.isAbandoned}
              onClick={() =>
                act("execute", executeWithdrawRequest, t("withdraw.executed", { amount: formatEth(request.amount) }))
              }
            >
              {isPending("execute")
                ? t("tx.processing")
                : status === "Approved"
                  ? t("withdraw.execute")
                  : t("withdraw.waitingVotes")}
            </button>
          )}
          <button
            className="btn-secondary flex-1 sm:w-40"
            disabled={isBusy}
            onClick={() => act("cancel", cancelWithdrawRequest, t("withdraw.cancelled"))}
          >
            {isPending("cancel")
              ? t("tx.processing")
              : status === "Rejected"
                ? t("withdraw.closeRelease")
                : t("withdraw.cancel")}
          </button>
        </div>
      );
    }

    if (!wallet.account) return note(t("withdraw.connectToVote"));
    if (!isDonor) return note(t("withdraw.onlyDonors"));
    if (voter.vote === VOTE.Approve) {
      return (
        <span className="text-accent inline-flex items-center gap-1.5 text-sm font-semibold sm:w-40 sm:justify-end">
          <CheckIcon className="h-4 w-4" /> {t("withdraw.youApproved")}
        </span>
      );
    }
    if (voter.vote === VOTE.Reject) {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 dark:text-rose-400 sm:w-40 sm:justify-end">
          <XIcon className="h-4 w-4" /> {t("withdraw.youRejected")}
        </span>
      );
    }
    if (!voter.canVote) return note(t("withdraw.lateDonor"));
    if (status !== "Voting") return note(t("withdraw.votingClosed"));

    return (
      <div className="flex gap-2 sm:flex-col">
        <button
          className="btn-primary flex-1 sm:w-40"
          disabled={isBusy}
          onClick={() => act("approve", approveWithdrawRequest, t("withdraw.approvedToast"))}
        >
          {isPending("approve") ? t("tx.processing") : t("withdraw.approve")}
        </button>
        <button
          className="btn-secondary flex-1 hover:border-rose-200 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:text-rose-400 sm:w-40"
          disabled={isBusy}
          onClick={() => act("reject", rejectWithdrawRequest, t("withdraw.rejectedToast"))}
        >
          {isPending("reject") ? t("tx.processing") : t("withdraw.reject")}
        </button>
      </div>
    );
  };

  return (
    <div className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
        <StatusIcon status={status} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-bold ${status === "Cancelled" ? "text-faint line-through" : "text-strong"}`}>
            {formatEth(request.amount)}
          </p>
          {status !== "Cancelled" && <IdrValue eth={request.amount} />}
          <span className={style.badge}>{t(`withdraw.status.${status}`)}</span>
        </div>
        <p className="text-body mt-1 break-words text-sm">{request.description}</p>
        <p className="text-faint mt-1 text-xs">{t("withdraw.recipient", { address: label(request.recipient) })}</p>

        {isOpen && <VoteProgress request={request} status={status} reason={reason} now={now} />}
        {status === "Completed" && <CompletionProof request={request} />}
      </div>

      {renderActions()}
    </div>
  );
};

export default WithdrawRequestCard;
