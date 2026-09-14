import { useState } from "react";
import { useSelector } from "react-redux";
import { useTransaction } from "../../hooks/useTransaction";
import { campaignStatus, daysLeft, isBeforeDeadline } from "../../lib/campaign";
import { contribute } from "../../lib/contracts";
import { formatDate, formatEth, formatTimeLeft, sameAddress } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { selectAccount, selectWeb3 } from "../../store/wallet";
import WithdrawRequestForm from "../withdraw/WithdrawRequestForm";
import IdrValue from "../ui/IdrValue";
import { ShieldIcon } from "../ui/Icons";

/** Ringkasan transparansi dana: terkumpul / sudah ditarik / tersisa */
const FundSummary = ({ campaign }) => (
  <>
    <dl className="mt-5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center">
      {[
        { label: "Terkumpul", value: campaign.raisedAmount, className: "text-slate-900" },
        { label: "Sudah ditarik", value: campaign.withdrawnAmount, className: "text-amber-600" },
        { label: "Tersisa", value: campaign.balance, className: "text-emerald-600" },
      ].map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className={`mt-0.5 truncate text-sm font-bold ${item.className}`}>{formatEth(item.value)}</dd>
          <IdrValue eth={item.value} prefix="" className="block truncate text-[11px] text-slate-400" />
        </div>
      ))}
    </dl>
    {campaign.pendingWithdrawAmount > 0 && (
      <p className="mt-2 text-center text-xs text-slate-500">
        {formatEth(campaign.pendingWithdrawAmount)} sedang diajukan untuk ditarik
      </p>
    )}
  </>
);

const DonationForm = ({ campaign, onContributed }) => {
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const { run, isBusy } = useTransaction();
  const [amount, setAmount] = useState("");

  const quickAmounts = [1, 2, 5].map((multiplier) => campaign.minContribution * multiplier);

  const donate = async () => {
    if (!amount || Number(amount) < campaign.minContribution) {
      toastError(`Minimal donasi adalah ${formatEth(campaign.minContribution)}`);
      return;
    }
    const success = await run(
      "donate",
      () => contribute(web3, account, campaign.address, amount),
      `Terima kasih! Donasi ${formatEth(amount)} berhasil 💚`,
    );
    if (success) {
      setAmount("");
      onContributed?.();
    }
  };

  return (
    <>
      <label className="label" htmlFor="donation">
        Jumlah donasi
      </label>
      <div className="relative">
        <input
          id="donation"
          type="number"
          step="any"
          min={campaign.minContribution}
          placeholder={String(campaign.minContribution)}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={isBusy}
          className="input py-3 pr-14 text-base font-semibold"
        />
        <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">ETH</span>
      </div>
      {Number(amount) > 0 && <IdrValue eth={amount} className="mt-1.5 block text-xs text-slate-500" />}

      <div className="mt-3 flex flex-wrap gap-2">
        {quickAmounts.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setAmount(String(value))}
            disabled={isBusy}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              Number(amount) === value
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:border-emerald-300"
            }`}
          >
            {formatEth(value)}
          </button>
        ))}
      </div>

      <button className="btn-primary mt-5 w-full py-3 text-base" onClick={donate} disabled={isBusy}>
        {isBusy ? "Menunggu konfirmasi..." : "Donasi Sekarang"}
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">Donasi minimum {formatEth(campaign.minContribution)}</p>
    </>
  );
};

/** Panel samping halaman detail: progres, ringkasan dana, donasi, dan pengajuan penarikan */
const DonationPanel = ({ campaign, onChanged }) => {
  const account = useSelector(selectAccount);
  const status = campaignStatus(campaign);
  const isCreator = sameAddress(campaign.creator, account);
  // Donasi dibuka sampai deadline, walaupun target sudah tercapai
  const canContribute = isBeforeDeadline(campaign.deadline) && campaign.state !== "Expired";
  const remainingDays = daysLeft(campaign.deadline);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className={`badge ${status.className}`}>{status.label}</span>
        <span className="text-xs font-medium text-slate-500">
          {!canContribute
            ? `Berakhir ${formatDate(campaign.deadline)}`
            : remainingDays > 0
              ? `${remainingDays} hari lagi`
              : `${formatTimeLeft(campaign.deadline)} lagi`}
        </span>
      </div>

      <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">{formatEth(campaign.raisedAmount)}</p>
      <IdrValue eth={campaign.raisedAmount} className="block text-sm font-medium text-slate-500" />
      <p className="text-sm text-slate-500">terkumpul dari target {formatEth(campaign.goalAmount)}</p>

      <div className="progress-track mt-4 h-2.5">
        <div className="progress-bar" style={{ width: `${Math.min(campaign.progress, 100)}%` }} />
      </div>
      <p className="mt-2 text-sm font-semibold text-emerald-600">{campaign.progress}% tercapai</p>

      <FundSummary campaign={campaign} />

      <div className="mt-6 border-t border-slate-100 pt-6">
        {!canContribute ? (
          <p className="text-sm text-slate-500">
            Kampanye ini sudah tidak menerima donasi. Donatur tetap dapat memberikan suara pada permintaan penarikan
            dana.
          </p>
        ) : isCreator ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
            Kampanye ini milikmu. Pembuat kampanye tidak bisa berdonasi atau memberi suara di kampanyenya sendiri, agar
            penarikan dana tetap diputuskan oleh donatur.
          </p>
        ) : (
          <DonationForm campaign={campaign} onContributed={onChanged} />
        )}
      </div>

      {isCreator && (
        <div className="mt-6 border-t border-slate-100 pt-6">
          <WithdrawRequestForm campaign={campaign} onCreated={onChanged} />
        </div>
      )}

      <div className="mt-6 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-800">
        <ShieldIcon className="h-5 w-5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">
          Dana disimpan di smart contract. Penggalang dana hanya bisa menarik dana setelah disetujui donatur.
        </p>
      </div>
    </div>
  );
};

export default DonationPanel;
