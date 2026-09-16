import { useCallback, useEffect, useState } from "react";
import { useBlockRefresh } from "../../hooks/useBlockRefresh";
import { useNow } from "../../hooks/useNow";
import { useTransaction } from "../../hooks/useTransaction";
import { useWallet } from "../../hooks/useWallet";
import { appealDeadline, APPEAL_PERIOD_DAYS, MAX_TEXT_LENGTH } from "../../lib/campaign";
import { appealTakedown, loadAppeal, resolveAppeal } from "../../lib/contracts";
import { formatDate, formatDateTime, sameAddress } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import Modal from "../ui/Modal";
import { onError } from "../../lib/log";

/** Form teks wajib untuk mengajukan banding (penggalang dana) atau memberi keputusan (admin) */
const TextForm = ({ id, label, placeholder, note, submitLabel, submitClass = "btn-primary", onSubmit }) => {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim()) return toastError(t("appeal.errorText"));
        setIsBusy(true);
        await onSubmit(text.trim());
        setIsBusy(false);
        return undefined;
      }}
    >
      {note && <p className="notice-amber p-3 text-xs leading-relaxed">{note}</p>}
      <div>
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <textarea
          id={id}
          rows={4}
          maxLength={MAX_TEXT_LENGTH}
          className="input resize-none"
          placeholder={placeholder}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={isBusy}
        />
        <p className="text-faint mt-1 text-xs">{t("cancel.publicReason")}</p>
      </div>
      <button className={`${submitClass} w-full py-3`} disabled={isBusy}>
        {isBusy ? t("tx.waitingMetaMask") : submitLabel}
      </button>
    </form>
  );
};

/**
 * Status & aksi banding takedown: penggalang dana mengajukan (1x, maks. 14 hari),
 * admin menerima/menolak, dan semua orang bisa melihat isi banding & keputusannya.
 */
const AppealPanel = ({ campaign, onChanged }) => {
  const { t } = useI18n();
  const wallet = useWallet();
  const now = useNow();
  const { run } = useTransaction();
  const [appeal, setAppeal] = useState(null);
  const [modal, setModal] = useState(null); // "appeal" | "accept" | "reject"

  const reload = useCallback(() => {
    loadAppeal(campaign.address).then(setAppeal).catch(onError("Memuat banding"));
  }, [campaign.address]);

  useEffect(reload, [reload, campaign.appealStatus]);
  useBlockRefresh(reload, 5000);

  if (!campaign.cancelledByAdmin) return null;

  const isCreator = sameAddress(campaign.creator, wallet.account);
  const deadline = appealDeadline(campaign);
  const canAppeal = campaign.appealStatus === "None" && now <= deadline;

  const done = () => {
    setModal(null);
    reload();
    onChanged?.();
  };

  const submitAppeal = async (reason) => {
    const success = await run(
      "appeal",
      (signer) => appealTakedown(signer, campaign.address, reason),
      t("appeal.submitted"),
    );
    if (success) done();
  };

  const submitDecision = (accepted) => async (note) => {
    const success = await run(
      "resolveAppeal",
      (signer) => resolveAppeal(signer, campaign.address, accepted, note),
      accepted ? t("appeal.acceptedDone") : t("appeal.rejectedDone"),
    );
    if (success) done();
  };

  const renderStatus = () => {
    switch (campaign.appealStatus) {
      case "Pending":
        return <p className="text-sm font-semibold">{t("appeal.pending")}</p>;
      case "Accepted":
        return <p className="text-sm font-semibold">✓ {t("appeal.accepted")}</p>;
      case "Rejected":
        return <p className="text-sm font-semibold">{t("appeal.rejected")}</p>;
      default:
        if (!canAppeal) return <p className="text-sm">{t("appeal.closed")}</p>;
        return (
          <p className="text-sm">
            {isCreator
              ? t("appeal.creatorCanAppeal", { date: formatDate(deadline) })
              : t("appeal.canAppeal", { date: formatDate(deadline) })}
          </p>
        );
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-slate-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{t("appeal.title")}</p>
      <div className="mt-1">{renderStatus()}</div>

      {appeal && (
        <dl className="mt-2 space-y-2 text-sm">
          <div>
            <dt className="text-xs opacity-80">
              {t("appeal.reasonLabel")} · {formatDateTime(appeal.appealedAt)}
            </dt>
            <dd className="whitespace-pre-line break-words">“{appeal.reason}”</dd>
          </div>
          {appeal.note && (
            <div>
              <dt className="text-xs opacity-80">
                {t("appeal.noteLabel")} · {formatDateTime(appeal.resolvedAt)}
              </dt>
              <dd className="whitespace-pre-line break-words">“{appeal.note}”</dd>
            </div>
          )}
        </dl>
      )}

      {isCreator && canAppeal && (
        <button className="btn-secondary mt-3" onClick={() => setModal("appeal")}>
          {t("appeal.button")}
        </button>
      )}
      {wallet.isAdmin && campaign.appealStatus === "Pending" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => setModal("accept")}>
            {t("appeal.accept")}
          </button>
          <button className="btn-danger" onClick={() => setModal("reject")}>
            {t("appeal.reject")}
          </button>
        </div>
      )}

      <Modal open={modal === "appeal"} onClose={() => setModal(null)} title={t("appeal.button")}>
        <TextForm
          id="appeal-reason"
          label={t("appeal.reasonLabel")}
          placeholder={t("appeal.reasonPlaceholder")}
          note={t("appeal.formNote", { days: APPEAL_PERIOD_DAYS })}
          submitLabel={t("appeal.submit")}
          onSubmit={submitAppeal}
        />
      </Modal>
      <Modal
        open={modal === "accept" || modal === "reject"}
        onClose={() => setModal(null)}
        title={modal === "accept" ? t("appeal.accept") : t("appeal.reject")}
      >
        <TextForm
          id="appeal-note"
          label={t("appeal.noteLabel")}
          placeholder={t("appeal.notePlaceholder")}
          note={modal === "accept" ? t("appeal.acceptNote") : t("appeal.rejectNote")}
          submitLabel={modal === "accept" ? t("appeal.accept") : t("appeal.reject")}
          submitClass={modal === "accept" ? "btn-primary" : "btn-danger"}
          onSubmit={submitDecision(modal === "accept")}
        />
      </Modal>
    </div>
  );
};

export default AppealPanel;
