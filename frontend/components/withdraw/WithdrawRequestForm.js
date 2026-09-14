import { useState } from "react";
import { useSelector } from "react-redux";
import { useTransaction } from "../../hooks/useTransaction";
import { QUORUM_PERCENT, VOTING_PERIOD_DAYS } from "../../lib/campaign";
import { createWithdrawRequest } from "../../lib/contracts";
import { formatEth } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { selectAccount, selectWeb3 } from "../../store/wallet";
import IdrValue from "../ui/IdrValue";

/** Form pengajuan penarikan dana untuk pembuat kampanye */
const WithdrawRequestForm = ({ campaign, onCreated }) => {
  const web3 = useSelector(selectWeb3);
  const account = useSelector(selectAccount);
  const { run, isBusy } = useTransaction();
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");

  const availableBalance = Math.max(0, campaign.balance - campaign.pendingWithdrawAmount);

  const submit = async () => {
    if (!reason.trim()) {
      toastError("Tuliskan alasan penarikan agar donatur bisa menilai sebelum voting");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toastError("Masukkan jumlah penarikan");
      return;
    }
    if (Number(amount) > availableBalance) {
      toastError(`Jumlah penarikan melebihi saldo yang tersedia (${formatEth(availableBalance)})`);
      return;
    }

    const success = await run(
      "request",
      () =>
        createWithdrawRequest(web3, account, campaign.address, {
          description: reason.trim(),
          amount,
          recipient: account,
        }),
      `Permintaan penarikan ${formatEth(amount)} berhasil dibuat`,
    );
    if (success) {
      setReason("");
      setAmount("");
      onCreated?.();
    }
  };

  return (
    <>
      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Saldo tersedia untuk diajukan</p>
        <p className="mt-1 text-xl font-bold text-slate-900">{formatEth(availableBalance)}</p>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-900">Ajukan penarikan dana</p>
      <label className="label mt-3" htmlFor="withdraw-reason">
        Alasan penarikan
      </label>
      <textarea
        id="withdraw-reason"
        rows={2}
        maxLength={280}
        placeholder="Contoh: Pembelian 50 paket buku dan seragam"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={isBusy}
        className="input mb-3 resize-none"
      />

      <label className="label" htmlFor="withdraw-amount">
        Jumlah
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
        <span className="absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">ETH</span>
      </div>
      {Number(amount) > 0 && <IdrValue eth={amount} className="mt-1.5 block text-xs text-slate-500" />}

      <button className="btn-primary mt-3 w-full py-3" onClick={submit} disabled={isBusy || availableBalance <= 0}>
        {isBusy ? "Menunggu konfirmasi..." : "Ajukan Penarikan"}
      </button>
      <p className="mt-3 text-xs text-slate-500">
        Dana bisa ditarik berapa pun jumlah yang terkumpul, setelah disetujui donatur: langsung jika lebih dari 50%
        donatur setuju, atau setelah voting {VOTING_PERIOD_DAYS} hari jika minimal {QUORUM_PERCENT}% donatur memilih dan
        lebih banyak yang setuju. Batalkan pengajuan lama untuk melepas saldonya.
      </p>
    </>
  );
};

export default WithdrawRequestForm;
