import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { useWallet } from "../../hooks/useWallet";
import {
  ABANDON_PERIOD_DAYS,
  campaignStatus,
  daysLeft,
  isBeforeDeadline,
  MAX_MESSAGE_LENGTH,
} from "../../lib/campaign";
import { claimRefund, contribute } from "../../lib/contracts";
import { formatDate, formatEth, formatTimeLeft, sameAddress } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import IdrValue from "../ui/IdrValue";
import { ShieldIcon, WalletIcon } from "../ui/Icons";
import WithdrawRequestForm from "../withdraw/WithdrawRequestForm";

/** Ringkasan transparansi dana: terkumpul / sudah ditarik / tersisa */
const FundSummary = ({ campaign }) => {
  const { t } = useI18n();
  return (
    <>
      <dl className="surface-muted mt-5 grid grid-cols-3 gap-2 rounded-xl p-3 text-center">
        {[
          { label: t("fund.raised"), value: campaign.raisedAmount, className: "text-strong" },
          {
            label: t("fund.withdrawn"),
            value: campaign.withdrawnAmount,
            className: "text-amber-600 dark:text-amber-400",
          },
          { label: t("fund.remaining"), value: campaign.balance, className: "text-accent" },
        ].map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-muted text-[11px] font-medium uppercase tracking-wide">{item.label}</dt>
            <dd className={`mt-0.5 truncate text-sm font-bold ${item.className}`}>{formatEth(item.value)}</dd>
            <IdrValue eth={item.value} prefix="" className="text-faint block truncate text-[11px]" />
          </div>
        ))}
      </dl>
      {campaign.pendingWithdrawAmount > 0 && !campaign.isRefundOpen && (
        <p className="text-muted mt-2 text-center text-xs">
          {t("fund.pending", { amount: formatEth(campaign.pendingWithdrawAmount) })}
        </p>
      )}
    </>
  );
};

const DonationForm = ({ campaign, onContributed }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  const quickAmounts = [1, 2, 5].map((multiplier) => campaign.minContribution * multiplier);

  const donate = async () => {
    if (!amount || Number(amount) < campaign.minContribution) {
      toastError(t("donation.errorMinimum", { amount: formatEth(campaign.minContribution) }));
      return;
    }
    const success = await run(
      "donate",
      (signer) => contribute(signer, campaign.address, amount, message.trim()),
      t("donation.success", { amount: formatEth(amount) }),
    );
    if (success) {
      setAmount("");
      setMessage("");
      onContributed?.();
    }
  };

  return (
    <>
      <label className="label" htmlFor="donation">
        {t("donation.amount")}
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
        <span className="text-faint absolute inset-y-0 right-4 flex items-center text-sm font-semibold">ETH</span>
      </div>
      {Number(amount) > 0 && <IdrValue eth={amount} className="text-muted mt-1.5 block text-xs" />}

      <div className="mt-3 flex flex-wrap gap-2">
        {quickAmounts.map((value) => (
          <button
            type="button"
            key={value}
            onClick={() => setAmount(String(value))}
            disabled={isBusy}
            className={`chip rounded-lg px-3 ${Number(amount) === value ? "chip-active" : ""}`}
          >
            {formatEth(value)}
          </button>
        ))}
      </div>

      <label className="label mt-4" htmlFor="donation-message">
        {t("donation.message")} <span className="text-faint font-normal">({t("common.optional")})</span>
      </label>
      <textarea
        id="donation-message"
        rows={2}
        maxLength={MAX_MESSAGE_LENGTH}
        className="input resize-none"
        placeholder={t("donation.messagePlaceholder")}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isBusy}
      />
      <p className="text-faint mt-1 text-right text-xs">
        {message.length}/{MAX_MESSAGE_LENGTH}
      </p>

      <button className="btn-primary mt-4 w-full py-3 text-base" onClick={donate} disabled={isBusy}>
        {isBusy ? t("tx.waiting") : t("donation.submit")}
      </button>
      <p className="text-muted mt-3 text-center text-xs">
        {t("donation.minimum", { amount: formatEth(campaign.minContribution) })}
      </p>
    </>
  );
};

/**
 * Refund untuk donatur: kampanye dibatalkan (penggalang dana / takedown admin) atau dana terbengkalai
 * (penggalang dana tidak aktif lama setelah kampanye berakhir).
 */
const RefundBox = ({ campaign, accountInfo, onClaimed }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();

  // Status dibaca dari contract (isRefundOpen / isAbandoned), bukan dari jam komputer
  if (!campaign.isRefundOpen && isBeforeDeadline(campaign.deadline)) return null;

  if (!campaign.isRefundOpen) {
    return (
      <p className="surface-muted text-muted mt-4 rounded-xl p-3 text-xs leading-relaxed">
        {t("abandoned.info", { date: formatDate(campaign.abandonedAt), days: ABANDON_PERIOD_DAYS })}
      </p>
    );
  }

  const claim = async () => {
    const success = await run(
      "claim",
      (signer) => claimRefund(signer, campaign.address),
      t("abandoned.claimed", { amount: formatEth(accountInfo.refundable) }),
    );
    if (success) onClaimed?.();
  };

  return (
    <div className="notice-rose mt-4 p-4">
      <p className="text-sm font-semibold">
        {campaign.isCancelled ? t("refund.cancelledTitle") : t("abandoned.title")}
      </p>
      <p className="mt-1 text-xs leading-relaxed">
        {campaign.isCancelled
          ? t("refund.cancelledDescription")
          : t("abandoned.description", { days: ABANDON_PERIOD_DAYS })}
      </p>
      {accountInfo?.contributed > 0 &&
        (accountInfo.refundClaimed ? (
          <p className="text-accent mt-3 text-sm font-semibold">✓ {t("abandoned.alreadyClaimed")}</p>
        ) : (
          <button className="btn-primary mt-3 w-full" onClick={claim} disabled={isBusy || accountInfo.refundable <= 0}>
            {isBusy ? t("tx.waiting") : t("abandoned.claim", { amount: formatEth(accountInfo.refundable) })}
          </button>
        ))}
    </div>
  );
};

/** Panel samping halaman detail: progres, ringkasan dana, donasi, dana terbengkalai, dan pengajuan penarikan */
const DonationPanel = ({ campaign, accountInfo, onChanged }) => {
  const { t } = useI18n();
  const wallet = useWallet();
  const status = campaignStatus(campaign);
  const isCreator = sameAddress(campaign.creator, wallet.account);
  // Donasi dibuka sampai deadline, walaupun target sudah tercapai
  const canContribute = isBeforeDeadline(campaign.deadline) && campaign.state !== "Expired";
  const remainingDays = daysLeft(campaign.deadline);

  const renderDonation = () => {
    if (!canContribute) {
      return (
        <p className="text-muted text-sm">
          {campaign.isCancelled
            ? t("donation.closedCancelled")
            : campaign.closedEarly
              ? t("donation.closedEarly")
              : t("donation.closed")}
        </p>
      );
    }
    if (!wallet.account) {
      return (
        <button className="btn-primary w-full py-3 text-base" onClick={wallet.connect} disabled={wallet.isConnecting}>
          <WalletIcon className="h-5 w-5" />
          {wallet.isConnecting ? t("wallet.connecting") : t("donation.connectToDonate")}
        </button>
      );
    }
    if (isCreator)
      return <p className="surface-muted text-muted rounded-xl p-3 text-sm">{t("donation.creatorNote")}</p>;
    return <DonationForm campaign={campaign} onContributed={onChanged} />;
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className={status.className}>{t(`status.${status.key}`)}</span>
        <span className="text-muted text-xs font-medium">
          {!canContribute
            ? t(campaign.closedEarly ? "campaign.closedOn" : "campaign.endedOn", {
                date: formatDate(campaign.deadline),
              })
            : remainingDays > 0
              ? t("campaign.daysLeft", { days: remainingDays })
              : t("campaign.timeLeft", { time: formatTimeLeft(campaign.deadline) })}
        </span>
      </div>

      <p className="text-strong mt-5 text-3xl font-extrabold tracking-tight">{formatEth(campaign.raisedAmount)}</p>
      <IdrValue eth={campaign.raisedAmount} className="text-muted block text-sm font-medium" />
      <p className="text-muted text-sm">{t("campaign.raisedOfTarget", { goal: formatEth(campaign.goalAmount) })}</p>

      <div className="progress-track mt-4 h-2.5">
        <div className="progress-bar" style={{ width: `${Math.min(campaign.progress, 100)}%` }} />
      </div>
      <p className="text-accent mt-2 text-sm font-semibold">{t("campaign.progress", { percent: campaign.progress })}</p>

      <FundSummary campaign={campaign} />
      <RefundBox campaign={campaign} accountInfo={accountInfo} onClaimed={onChanged} />

      <div className="divider mt-6 border-t pt-6">{renderDonation()}</div>

      {isCreator && !campaign.isRefundOpen && (
        <div className="divider mt-6 border-t pt-6">
          <WithdrawRequestForm campaign={campaign} onCreated={onChanged} />
        </div>
      )}

      <div className="notice-emerald mt-6 flex items-start gap-3 p-4">
        <ShieldIcon className="h-5 w-5 flex-shrink-0" />
        <p className="text-xs leading-relaxed">{t("donation.safety")}</p>
      </div>
    </div>
  );
};

export default DonationPanel;
