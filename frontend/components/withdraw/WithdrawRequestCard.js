import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNow } from "../../hooks/useNow";
import { useTransaction } from "../../hooks/useTransaction";
import { evaluateWithdrawRequest, majorityVotes, quorumVotes, VOTE } from "../../lib/campaign";
import { EXPLORER_URL } from "../../lib/config";
import {
  approveWithdrawRequest,
  cancelWithdrawRequest,
  executeWithdrawRequest,
  getVote,
  rejectWithdrawRequest,
} from "../../lib/contracts";
import { formatDate, formatEth, formatTimeLeft, sameAddress, shortAddress } from "../../lib/format";
import { toastSuccess } from "../../lib/toast";
import { selectAccount, selectWeb3 } from "../../store/wallet";
import IdrValue from "../ui/IdrValue";
import { CheckIcon, ClockIcon, XIcon } from "../ui/Icons";

const STATUS_STYLE = {
  Voting: { label: "Voting berlangsung", badge: "bg-amber-100 text-amber-700", icon: "bg-amber-50 text-amber-600" },
  Approved: { label: "Disetujui", badge: "bg-emerald-100 text-emerald-700", icon: "bg-emerald-50 text-emerald-600" },
  Rejected: { label: "Ditolak", badge: "bg-rose-100 text-rose-700", icon: "bg-rose-50 text-rose-600" },
  Completed: { label: "Selesai", badge: "bg-emerald-100 text-emerald-700", icon: "bg-emerald-50 text-emerald-600" },
  Cancelled: { label: "Dibatalkan", badge: "bg-slate-200 text-slate-600", icon: "bg-slate-100 text-slate-500" },
};

const StatusIcon = ({ status }) => {
  if (status === "Completed" || status === "Approved") return <CheckIcon />;
  if (status === "Voting") return <ClockIcon />;
  return <XIcon />;
};

const VoteProgress = ({ request, status, reason, contributorCount, now }) => {
  const percent = (count) => (contributorCount ? (count / contributorCount) * 100 : 0);

  return (
    <div className="mt-3 max-w-sm">
      <div className="flex flex-wrap justify-between gap-x-3 text-xs">
        <span className="font-semibold text-slate-700">
          <span className="text-emerald-600">{request.approvalCount} setuju</span> ·{" "}
          <span className="text-rose-600">{request.rejectionCount} tolak</span>
        </span>
        <span className="text-slate-400">dari {contributorCount} donatur</span>
      </div>
      <div className="progress-track mt-1.5 flex h-1.5">
        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent(request.approvalCount)}%` }} />
        <div className="h-full bg-rose-400 transition-all" style={{ width: `${percent(request.rejectionCount)}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        {status === "Voting"
          ? `Berakhir dalam ${formatTimeLeft(request.votingDeadline, now)} · langsung disetujui jika ${majorityVotes(
              contributorCount,
            )} donatur setuju, atau setelah voting berakhir jika minimal ${quorumVotes(
              contributorCount,
            )} donatur memilih dan lebih banyak yang setuju`
          : reason || "Status diperbarui dari blockchain"}
      </p>
    </div>
  );
};

const CompletionProof = ({ request }) => (
  <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-400">
    <span>Disetujui {request.approvalCount} donatur</span>
    {request.completedAt && <span>· Ditarik {formatDate(request.completedAt)}</span>}
    {request.txHash &&
      (EXPLORER_URL ? (
        <a
          href={`${EXPLORER_URL}/tx/${request.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-emerald-600 hover:underline"
        >
          · tx {shortAddress(request.txHash)} ↗
        </a>
      ) : (
        <button
          type="button"
          className="font-mono text-slate-500 hover:text-emerald-600"
          title="Salin hash transaksi"
          onClick={() => {
            navigator.clipboard?.writeText(request.txHash);
            toastSuccess("Hash transaksi disalin");
          }}
        >
          · tx {shortAddress(request.txHash)}
        </button>
      ))}
  </p>
);

const WithdrawRequestCard = ({ request, campaign, contributorCount, isDonor, onChanged }) => {
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const now = useNow();
  const { run, isPending, isBusy } = useTransaction();
  const [myVote, setMyVote] = useState(VOTE.None);

  // Status resmi dari contract (getRequestStatus); perhitungan lokal hanya untuk teks penjelasan
  const local = evaluateWithdrawRequest(request, contributorCount, now);
  const status = request.status || local.status;
  const reason = local.status === status ? local.reason : null;
  const style = STATUS_STYLE[status];
  const isCreator = sameAddress(account, campaign.creator);
  const isOpen = ["Voting", "Approved", "Rejected"].includes(status);

  useEffect(() => {
    if (!web3 || !account || !isDonor || isCreator) return;
    getVote(web3, campaign.address, request.id, account)
      .then(setMyVote)
      .catch(() => setMyVote(VOTE.None));
  }, [web3, account, isDonor, isCreator, campaign.address, request.id]);

  const act = async (key, action, message, vote) => {
    const success = await run(key, () => action(web3, account, campaign.address, request.id), message);
    if (!success) return;
    if (vote) setMyVote(vote);
    onChanged?.();
  };

  const renderActions = () => {
    if (status === "Completed")
      return <span className="text-sm font-semibold text-emerald-600">Dana sudah ditarik</span>;
    if (status === "Cancelled") return null;

    if (isCreator) {
      return (
        <div className="flex gap-2 sm:flex-col">
          {status !== "Rejected" && (
            <button
              className="btn-primary flex-1 sm:w-40"
              disabled={status !== "Approved" || isBusy}
              onClick={() =>
                act("execute", executeWithdrawRequest, `Dana ${formatEth(request.amount)} berhasil ditarik`)
              }
            >
              {isPending("execute") ? "Memproses..." : status === "Approved" ? "Tarik Dana" : "Menunggu voting"}
            </button>
          )}
          <button
            className="btn-secondary flex-1 sm:w-40"
            disabled={isBusy}
            onClick={() =>
              act("cancel", cancelWithdrawRequest, "Permintaan dibatalkan, saldo yang dipesan sudah dilepas")
            }
          >
            {isPending("cancel") ? "Memproses..." : status === "Rejected" ? "Tutup & lepas saldo" : "Batalkan"}
          </button>
        </div>
      );
    }

    if (!isDonor) {
      return (
        <span className="text-xs text-slate-400 sm:w-40 sm:text-right">
          Hanya donatur kampanye ini yang bisa memberi suara
        </span>
      );
    }

    if (myVote === VOTE.Approve) {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 sm:w-40 sm:justify-end">
          <CheckIcon className="h-4 w-4" /> Kamu setuju
        </span>
      );
    }
    if (myVote === VOTE.Reject) {
      return (
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 sm:w-40 sm:justify-end">
          <XIcon className="h-4 w-4" /> Kamu menolak
        </span>
      );
    }

    if (status !== "Voting") {
      return <span className="text-xs text-slate-400 sm:w-40 sm:text-right">Voting sudah ditutup</span>;
    }

    return (
      <div className="flex gap-2 sm:flex-col">
        <button
          className="btn-primary flex-1 sm:w-40"
          disabled={isBusy}
          onClick={() => act("approve", approveWithdrawRequest, "Kamu menyetujui permintaan ini", VOTE.Approve)}
        >
          {isPending("approve") ? "Memproses..." : "Setujui"}
        </button>
        <button
          className="btn-secondary flex-1 hover:border-rose-200 hover:text-rose-600 sm:w-40"
          disabled={isBusy}
          onClick={() => act("reject", rejectWithdrawRequest, "Kamu menolak permintaan ini", VOTE.Reject)}
        >
          {isPending("reject") ? "Memproses..." : "Tolak"}
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
          <p className={`font-bold ${status === "Cancelled" ? "text-slate-400 line-through" : "text-slate-900"}`}>
            {formatEth(request.amount)}
          </p>
          {status !== "Cancelled" && <IdrValue eth={request.amount} />}
          <span className={`badge ${style.badge}`}>{style.label}</span>
        </div>
        <p className="mt-1 break-words text-sm text-slate-600">{request.description}</p>
        <p className="mt-1 text-xs text-slate-400">Penerima {shortAddress(request.recipient)}</p>

        {isOpen && (
          <VoteProgress
            request={request}
            status={status}
            reason={reason}
            contributorCount={contributorCount}
            now={now}
          />
        )}
        {status === "Completed" && <CompletionProof request={request} />}
      </div>

      {renderActions()}
    </div>
  );
};

export default WithdrawRequestCard;
