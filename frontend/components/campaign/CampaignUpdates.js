import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { postUpdate } from "../../lib/contracts";
import { formatDate } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import { SparklesIcon } from "../ui/Icons";
import Loader from "../ui/Loader";

const UpdateForm = ({ campaignAddress, onPosted }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return toastError(t("updates.errorEmpty"));
    const success = await run(
      "update",
      (signer) => postUpdate(signer, campaignAddress, message.trim()),
      t("updates.posted"),
    );
    if (success) {
      setMessage("");
      onPosted?.();
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} className="surface-muted mb-6 rounded-xl p-4">
      <label className="label" htmlFor="update-message">
        {t("updates.formLabel")}
      </label>
      <textarea
        id="update-message"
        rows={3}
        maxLength={1000}
        className="input resize-none"
        placeholder={t("updates.placeholder")}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        disabled={isBusy}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-faint text-xs">{t("updates.permanent", { count: message.length })}</span>
        <button className="btn-primary py-2" disabled={isBusy}>
          {isBusy ? t("tx.waiting") : t("updates.submit")}
        </button>
      </div>
    </form>
  );
};

/** Kabar/laporan penggunaan dana dari penggalang dana */
const CampaignUpdates = ({ campaignAddress, updates, isCreator, onPosted }) => {
  const { t } = useI18n();
  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <SparklesIcon className="text-faint h-5 w-5" />
        <h2 className="text-strong text-lg font-bold">{t("updates.title")}</h2>
        {updates?.length > 0 && <span className="badge-slate">{updates.length}</span>}
      </div>

      <div className="mt-5">
        {isCreator && <UpdateForm campaignAddress={campaignAddress} onPosted={onPosted} />}

        {!updates ? (
          <Loader label={t("updates.loading")} />
        ) : updates.length === 0 ? (
          <p className="text-muted text-sm">{t("updates.empty")}</p>
        ) : (
          <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-800">
            {updates.map((update) => (
              <li key={update.id} className="relative">
                <span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
                <p className="text-faint text-xs font-semibold">{formatDate(update.postedAt)}</p>
                <p className="text-body mt-1 whitespace-pre-line text-sm leading-relaxed">{update.message}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default CampaignUpdates;
