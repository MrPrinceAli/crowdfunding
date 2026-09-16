import { useState } from "react";
import { useSelector } from "react-redux";
import { useTransaction } from "../../hooks/useTransaction";
import { QUORUM_PERCENT, VOTING_PERIOD_DAYS } from "../../lib/campaign";
import { createWithdrawRequest } from "../../lib/contracts";
import { formatEth } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { selectAccount } from "../../store/wallet";
import { useI18n } from "../providers/PreferencesProvider";
import IdrValue from "../ui/IdrValue";

/** Form pengajuan penarikan dana untuk pembuat kampanye */
const WithdrawRequestForm = ({ campaign, onCreated }) => {
  const { t } = useI18n();
  const account = useSelector(selectAccount);
  const { run, isBusy } = useTransaction();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const availableBalance = Math.max(0, campaign.balance - campaign.pendingWithdrawAmount);

  const submit = async () => {
    if (!reason.trim()) return toastError(t("withdrawForm.errorReason"));
    if (!amount || Number(amount) <= 0) return toastError(t("withdrawForm.errorAmount"));
    if (Number(amount) > availableBalance) {
      return toastError(t("withdrawForm.errorBalance", { amount: formatEth(availableBalance) }));
    }

    const success = await run(
      "request",
      (signer) =>
        createWithdrawRequest(signer, campaign.address, { description: reason.trim(), amount, recipient: account }),
      t("withdrawForm.created", { amount: formatEth(amount) }),
    );
    if (success) {
      setReason("");
      setAmount("");
      onCreated?.();
    }
    return undefined;
  };

  return (
    <>
      <div className="surface-muted rounded-xl p-4">
        <p className="text-muted text-xs font-medium uppercase tracking-wide">{t("withdrawForm.available")}</p>
        <p className="text-strong mt-1 text-xl font-bold">{formatEth(availableBalance)}</p>
      </div>

      <p className="text-strong mt-5 text-sm font-semibold">{t("withdrawForm.title")}</p>
      <label className="label mt-3" htmlFor="withdraw-reason">
        {t("withdrawForm.reason")}
      </label>
      <textarea
        id="withdraw-reason"
        rows={2}
        maxLength={280}
        placeholder={t("withdrawForm.reasonPlaceholder")}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={isBusy}
        className="input mb-3 resize-none"
      />

      <label className="label" htmlFor="withdraw-amount">
        {t("withdrawForm.amount")}
      </label>
      <div className="relative">
        <input
          id="withdraw-amount"
          type="number"
          step="any"
          min={0}
          max={availableBalance}
          placeholder="0.0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={isBusy}
          className="input py-3 pr-14"
        />
        <span className="text-faint absolute inset-y-0 right-4 flex items-center text-sm font-semibold">ETH</span>
      </div>
      {Number(amount) > 0 && <IdrValue eth={amount} className="text-muted mt-1.5 block text-xs" />}

      <button className="btn-primary mt-3 w-full py-3" onClick={submit} disabled={isBusy || availableBalance <= 0}>
        {isBusy ? t("tx.waiting") : t("withdrawForm.submit")}
      </button>
      <p className="text-muted mt-3 text-xs">
        {t("withdrawForm.rules", { days: VOTING_PERIOD_DAYS, quorum: QUORUM_PERCENT })}
      </p>
    </>
  );
};

export default WithdrawRequestForm;
