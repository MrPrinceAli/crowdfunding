import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { isBeforeDeadline, MAX_EXTENSION_DAYS } from "../../lib/campaign";
import { closeFunding, editCampaign, extendDeadline } from "../../lib/contracts";
import { formatDate } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import { BanIcon, CalendarIcon, PencilIcon, StopIcon } from "../ui/Icons";
import Modal from "../ui/Modal";
import { CategoryField, DescriptionField, ImageField, isValidImageUrl, LocationField } from "./CampaignFields";
import CancelForm from "./CancelForm";
import { endOfDayInSeconds } from "./CampaignForm";

const toDateInput = (seconds) => {
  const date = new Date(seconds * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const EditForm = ({ campaign, onDone }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const [form, setForm] = useState({
    description: campaign.description,
    category: campaign.category,
    location: campaign.location,
    imageUrl: campaign.imageUrl,
  });
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidImageUrl(form.imageUrl.trim())) return toastError(t("form.errorImageUrl"));
    const success = await run(
      "edit",
      (signer) =>
        editCampaign(signer, campaign.address, {
          description: form.description.trim(),
          category: form.category,
          location: form.location,
          imageUrl: form.imageUrl.trim(),
        }),
      t("creator.edited"),
    );
    if (success) onDone();
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="notice-amber p-3 text-xs">{t("creator.editNote")}</p>
      <DescriptionField value={form.description} onChange={update("description")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CategoryField value={form.category} onChange={update("category")} />
        <LocationField value={form.location} onChange={update("location")} />
      </div>
      <ImageField value={form.imageUrl} onChange={update("imageUrl")} />
      <button className="btn-primary w-full py-3" disabled={isBusy}>
        {isBusy ? t("tx.waitingMetaMask") : t("creator.saveChanges")}
      </button>
    </form>
  );
};

const ExtendForm = ({ campaign, onDone }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const minDate = toDateInput(campaign.deadline + 86400);
  const maxDate = toDateInput(campaign.deadline + MAX_EXTENSION_DAYS * 86400);
  const [date, setDate] = useState(maxDate);

  const submit = async (event) => {
    event.preventDefault();
    // Akhir hari yang dipilih, dibatasi maksimal +30 hari dari deadline sekarang
    const newDeadline = Math.min(endOfDayInSeconds(date), campaign.deadline + MAX_EXTENSION_DAYS * 86400);
    if (newDeadline <= campaign.deadline) return toastError(t("creator.extendErrorEarlier"));
    const success = await run(
      "extend",
      (signer) => extendDeadline(signer, campaign.address, newDeadline),
      t("creator.extended", { date: formatDate(newDeadline) }),
    );
    if (success) onDone();
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="notice-amber p-3 text-xs">{t("creator.extendNote", { days: MAX_EXTENSION_DAYS })}</p>
      <p className="text-body text-sm">{t("creator.currentDeadline", { date: formatDate(campaign.deadline) })}</p>
      <div>
        <label className="label" htmlFor="new-deadline">
          {t("creator.newDeadline")}
        </label>
        <input
          id="new-deadline"
          type="date"
          className="input"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>
      <button className="btn-primary w-full py-3" disabled={isBusy}>
        {isBusy ? t("tx.waitingMetaMask") : t("creator.extendSubmit")}
      </button>
    </form>
  );
};

const CloseForm = ({ campaign, onDone }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();

  const submit = async () => {
    const success = await run("close", (signer) => closeFunding(signer, campaign.address), t("close.done"));
    if (success) onDone();
  };

  return (
    <div className="space-y-4">
      <p className="notice-amber p-3 text-xs leading-relaxed">{t("close.warning")}</p>
      <button className="btn-primary w-full py-3" onClick={submit} disabled={isBusy}>
        {isBusy ? t("tx.waitingMetaMask") : t("close.submit")}
      </button>
    </div>
  );
};

/** Alat untuk pembuat kampanye: edit, perpanjang deadline, tutup donasi lebih awal, dan batalkan kampanye */
const CreatorTools = ({ campaign, onChanged }) => {
  const { t } = useI18n();
  const [openForm, setOpenForm] = useState(null);
  const isRunning = isBeforeDeadline(campaign.deadline) && campaign.state !== "Expired";
  const canExtend = isRunning && !campaign.deadlineExtended && campaign.state !== "Successful";

  if (campaign.isCancelled) return null;

  const done = () => {
    setOpenForm(null);
    onChanged?.();
  };

  return (
    <div className="card p-6">
      <h2 className="text-strong font-bold">{t("creator.toolsTitle")}</h2>
      <p className="text-muted mt-1 text-sm">
        {isRunning ? t("creator.toolsDescription") : t("creator.toolsDescriptionEnded")}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {isRunning && (
          <>
            <button className="btn-secondary" onClick={() => setOpenForm("edit")}>
              <PencilIcon className="h-4 w-4" />
              {t("creator.edit")}
            </button>
            <button className="btn-secondary" onClick={() => setOpenForm("extend")} disabled={!canExtend}>
              <CalendarIcon className="h-4 w-4" />
              {t("creator.extend")}
            </button>
            {!canExtend && (
              <p className="text-faint text-xs">
                {campaign.deadlineExtended ? t("creator.alreadyExtended") : t("creator.cannotExtendSuccessful")}
              </p>
            )}
            <button className="btn-secondary" onClick={() => setOpenForm("close")}>
              <StopIcon className="h-4 w-4" />
              {t("close.button")}
            </button>
          </>
        )}
        <button
          className="btn-secondary hover:border-rose-200 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
          onClick={() => setOpenForm("cancel")}
        >
          <BanIcon className="h-4 w-4" />
          {t("cancel.button")}
        </button>
      </div>

      <Modal open={openForm === "edit"} onClose={() => setOpenForm(null)} title={t("creator.edit")}>
        <EditForm campaign={campaign} onDone={done} />
      </Modal>
      <Modal open={openForm === "extend"} onClose={() => setOpenForm(null)} title={t("creator.extend")}>
        <ExtendForm campaign={campaign} onDone={done} />
      </Modal>
      <Modal open={openForm === "close"} onClose={() => setOpenForm(null)} title={t("close.title")}>
        <CloseForm campaign={campaign} onDone={done} />
      </Modal>
      <Modal open={openForm === "cancel"} onClose={() => setOpenForm(null)} title={t("cancel.title")}>
        <CancelForm campaign={campaign} mode="creator" onDone={done} />
      </Modal>
    </div>
  );
};

export default CreatorTools;
