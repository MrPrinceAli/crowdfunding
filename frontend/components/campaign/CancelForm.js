import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { cancelCampaign, takedownCampaign } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";

import { MAX_TEXT_LENGTH } from "../../lib/campaign";

/**
 * Form pembatalan kampanye dengan alasan wajib (tersimpan publik di blockchain).
 * mode "creator" = penggalang dana membatalkan, "admin" = takedown oleh admin.
 */
const CancelForm = ({ campaign, mode, onDone }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const prefix = mode === "admin" ? "takedown" : "cancel";

  const submit = async (event) => {
    event.preventDefault();
    if (!reason.trim()) return toastError(t(`${prefix}.errorReason`));
    const action = mode === "admin" ? takedownCampaign : cancelCampaign;
    const success = await run(prefix, (signer) => action(signer, campaign.address, reason.trim()), t(`${prefix}.done`));
    if (success) onDone?.();
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="notice-rose p-3 text-xs leading-relaxed">
        <p>{t(`${prefix}.warning`)}</p>
        <p className="mt-1">{t("cancel.refundNote")}</p>
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-reason`}>
          {t(`${prefix}.reason`)}
        </label>
        <textarea
          id={`${prefix}-reason`}
          rows={4}
          maxLength={MAX_TEXT_LENGTH}
          className="input resize-none"
          placeholder={t(`${prefix}.reasonPlaceholder`)}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={isBusy}
        />
        <p className="text-faint mt-1 text-xs">{t("cancel.publicReason")}</p>
      </div>
      <label className="text-body flex cursor-pointer items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 accent-rose-600"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        {t(`${prefix}.confirm`)}
      </label>
      <button className="btn-danger w-full py-3" disabled={isBusy || !confirmed}>
        {isBusy ? t("tx.waitingMetaMask") : t(`${prefix}.submit`)}
      </button>
    </form>
  );
};

export default CancelForm;
