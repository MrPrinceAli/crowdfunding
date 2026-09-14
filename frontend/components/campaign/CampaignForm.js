import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTransaction } from "../../hooks/useTransaction";
import { createCampaign } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { refreshCampaign } from "../../store/campaigns";
import { selectAccount, selectWeb3 } from "../../store/wallet";

const EMPTY_FORM = { title: "", description: "", goalAmount: "", minContribution: "", deadline: "" };

/** "YYYY-MM-DD" untuk besok (batas minimum input tanggal) */
const tomorrow = () => {
  const date = new Date(Date.now() + 86400000);
  return date.toISOString().slice(0, 10);
};

/** Deadline berlaku sampai akhir hari yang dipilih, dalam detik (sesuai block.timestamp) */
const endOfDayInSeconds = (dateString) => Math.floor(new Date(`${dateString}T23:59:59`).getTime() / 1000);

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
      <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">ETH</span>
    </div>
  </div>
);

const CampaignForm = ({ onCreated }) => {
  const dispatch = useDispatch();
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const { run, isBusy } = useTransaction();
  const [form, setForm] = useState(EMPTY_FORM);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const goalAmount = Number(form.goalAmount);
    const minContribution = Number(form.minContribution);

    if (goalAmount <= 0 || minContribution <= 0) {
      toastError("Target dana dan donasi minimum harus lebih dari 0");
      return;
    }
    if (minContribution > goalAmount) {
      toastError("Donasi minimum tidak boleh melebihi target dana");
      return;
    }

    const address = await run(
      "create",
      () =>
        createCampaign(web3, account, {
          title: form.title,
          description: form.description,
          goalAmount: form.goalAmount,
          minContribution: form.minContribution,
          deadline: endOfDayInSeconds(form.deadline),
        }),
      "Kampanye berhasil dibuat 🎉",
    );

    if (address) {
      await dispatch(refreshCampaign(address));
      setForm(EMPTY_FORM);
      onCreated?.(address);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="title">
          Judul kampanye
        </label>
        <input
          id="title"
          type="text"
          placeholder="Contoh: Bantu renovasi sekolah di desa"
          className="input"
          value={form.title}
          onChange={update("title")}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="description">
          Cerita kampanye
        </label>
        <textarea
          id="description"
          rows={4}
          placeholder="Ceritakan tujuan penggalangan dana dan bagaimana dana akan digunakan"
          className="input resize-none"
          value={form.description}
          onChange={update("description")}
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <EthInput
          id="goal"
          label="Target dana"
          placeholder="10"
          value={form.goalAmount}
          onChange={update("goalAmount")}
        />
        <EthInput
          id="minimum"
          label="Donasi minimum"
          placeholder="0.1"
          value={form.minContribution}
          onChange={update("minContribution")}
        />
      </div>
      <div>
        <label className="label" htmlFor="deadline">
          Batas waktu
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

      <button className="btn-primary w-full py-3" disabled={isBusy}>
        {isBusy ? "Menunggu konfirmasi MetaMask..." : "Mulai Galang Dana"}
      </button>
    </form>
  );
};

export default CampaignForm;
