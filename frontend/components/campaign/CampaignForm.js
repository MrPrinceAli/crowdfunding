import { useState } from "react";
import { useDispatch } from "react-redux";
import { useTransaction } from "../../hooks/useTransaction";
import { CATEGORIES } from "../../lib/campaign";
import { createCampaign } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { refreshCampaign } from "../../store/campaigns";
import { useI18n } from "../providers/PreferencesProvider";
import { CategoryField, DescriptionField, ImageField, isValidImageUrl, LocationField } from "./CampaignFields";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: CATEGORIES[0],
  location: "",
  imageUrl: "",
  goalAmount: "",
  minContribution: "",
  deadline: "",
};

/** "YYYY-MM-DD" untuk besok (batas minimum input tanggal) */
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);

/** Deadline berlaku sampai akhir hari yang dipilih, dalam detik (sesuai block.timestamp) */
export const endOfDayInSeconds = (dateString) => Math.floor(new Date(`${dateString}T23:59:59`).getTime() / 1000);

const EthInput = ({ id, label, value, onChange, placeholder }) => (
  <div>
    <label className="label" htmlFor={id}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type="number"
        step="any"
        min="0"
        placeholder={placeholder}
        className="input pr-14"
        value={value}
        onChange={onChange}
        required
      />
      <span className="text-faint absolute inset-y-0 right-4 flex items-center text-sm font-semibold">ETH</span>
    </div>
  </div>
);

const CampaignForm = ({ onCreated }) => {
  const { t } = useI18n();
  const dispatch = useDispatch();
  const { run, isBusy } = useTransaction();
  const [form, setForm] = useState(EMPTY_FORM);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const goalAmount = Number(form.goalAmount);
    const minContribution = Number(form.minContribution);

    if (goalAmount <= 0 || minContribution <= 0) return toastError(t("form.errorPositive"));
    if (minContribution > goalAmount) return toastError(t("form.errorMinAboveGoal"));
    if (!isValidImageUrl(form.imageUrl.trim())) return toastError(t("form.errorImageUrl"));

    const address = await run(
      "create",
      (signer) =>
        createCampaign(signer, {
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim(),
          deadline: endOfDayInSeconds(form.deadline),
        }),
      t("form.created"),
    );

    if (address) {
      await dispatch(refreshCampaign(address));
      setForm(EMPTY_FORM);
      onCreated?.(address);
    }
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          {t("form.title")}
        </label>
        <input
          id="title"
          type="text"
          maxLength={120}
          placeholder={t("form.titlePlaceholder")}
          className="input"
          value={form.title}
          onChange={update("title")}
          required
        />
      </div>
      <DescriptionField value={form.description} onChange={update("description")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <CategoryField value={form.category} onChange={update("category")} />
        <LocationField value={form.location} onChange={update("location")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <EthInput
          id="goal"
          label={t("form.goal")}
          placeholder="10"
          value={form.goalAmount}
          onChange={update("goalAmount")}
        />
        <EthInput
          id="minimum"
          label={t("form.minimum")}
          placeholder="0.1"
          value={form.minContribution}
          onChange={update("minContribution")}
        />
      </div>
      <div>
        <label className="label" htmlFor="deadline">
          {t("form.deadline")}
        </label>
        <input
          id="deadline"
          type="date"
          min={tomorrow()}
          className="input"
          value={form.deadline}
          onChange={update("deadline")}
          required
        />
      </div>
      <ImageField value={form.imageUrl} onChange={update("imageUrl")} />

      <button className="btn-primary w-full py-3" disabled={isBusy}>
        {isBusy ? t("tx.waitingMetaMask") : t("form.submit")}
      </button>
    </form>
  );
};

export default CampaignForm;
