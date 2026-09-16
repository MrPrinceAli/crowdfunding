import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { useWallet } from "../../hooks/useWallet";
import { reportCampaign, setCampaignVerified } from "../../lib/contracts";
import { formatDate, sameAddress } from "../../lib/format";
import { toastError } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import AddressName from "../ui/AddressName";
import { BanIcon } from "../ui/Icons";
import Modal from "../ui/Modal";
import CancelForm from "./CancelForm";

// Kunci alasan; teks laporan yang disimpan di blockchain memakai bahasa aktif saat melapor
const REPORT_REASONS = ["fake", "misuse", "fraud", "inappropriate", "other"];

const ReportForm = ({ campaignAddress, onReported }) => {
  const { t } = useI18n();
  const { run, isBusy } = useTransaction();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [detail, setDetail] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (reason === "other" && !detail.trim()) return toastError(t("report.errorDetail"));
    const label = t(`report.reason.${reason}`);
    const fullReason = detail.trim() ? `${label}: ${detail.trim()}` : label;
    const success = await run(
      "report",
      (signer) => reportCampaign(signer, campaignAddress, fullReason),
      t("report.sent"),
    );
    if (success) onReported?.();
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        {REPORT_REASONS.map((option) => (
          <label
            key={option}
            className="text-body flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"
          >
            <input
              type="radio"
              name="reason"
              value={option}
              checked={reason === option}
              onChange={() => setReason(option)}
              className="accent-emerald-600"
            />
            {t(`report.reason.${option}`)}
          </label>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="report-detail">
          {t("report.detail")} <span className="text-faint font-normal">({t("common.optional")})</span>
        </label>
        <textarea
          id="report-detail"
          rows={3}
          maxLength={800}
          className="input resize-none"
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
        />
      </div>
      <p className="text-muted text-xs">{t("report.publicNote")}</p>
      <button className="btn-danger w-full py-3" disabled={isBusy}>
        {isBusy ? t("tx.waiting") : t("report.submit")}
      </button>
    </form>
  );
};

/** Badge verifikasi (admin), tombol lapor, dan daftar laporan publik */
const ModerationPanel = ({ campaign, reports, accountInfo, onChanged }) => {
  const { t } = useI18n();
  const wallet = useWallet();
  const { run, isBusy } = useTransaction();
  const [reportOpen, setReportOpen] = useState(false);
  const [takedownOpen, setTakedownOpen] = useState(false);
  const isCreator = sameAddress(campaign.creator, wallet.account);

  const toggleVerified = async () => {
    const success = await run(
      "verify",
      (signer) => setCampaignVerified(signer, campaign.address, !campaign.isVerified),
      campaign.isVerified ? t("moderation.unverifiedDone") : t("moderation.verifiedDone"),
    );
    if (success) onChanged?.();
  };

  return (
    <div className="card p-6">
      <h2 className="text-strong font-bold">{t("moderation.title")}</h2>
      <p className="text-body mt-2 text-sm">
        {campaign.isVerified ? `✓ ${t("moderation.isVerified")}` : t("moderation.notVerified")}
      </p>

      {campaign.reportCount > 0 ? (
        <div className="notice-rose mt-4 p-3">
          <p className="text-sm font-semibold">⚠ {t("moderation.reportedTimes", { count: campaign.reportCount })}</p>
          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {(reports || []).map((report) => (
              <li key={report.reporter} className="text-xs">
                <AddressName address={report.reporter} className="font-semibold" /> · {formatDate(report.reportedAt)}
                <br />
                {report.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-muted mt-2 text-sm">{t("moderation.noReports")}</p>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {wallet.isAdmin && !campaign.isCancelled && (
          <>
            <button className="btn-secondary" onClick={toggleVerified} disabled={isBusy}>
              {isBusy ? t("tx.processing") : campaign.isVerified ? t("moderation.unverify") : t("moderation.verify")}
            </button>
            <button className="btn-danger" onClick={() => setTakedownOpen(true)}>
              <BanIcon className="h-4 w-4" />
              {t("takedown.button")}
            </button>
          </>
        )}
        {wallet.account && !isCreator && !campaign.isCancelled && (
          <button
            className="btn-secondary hover:border-rose-200 hover:text-rose-600 dark:hover:border-rose-500/40 dark:hover:text-rose-400"
            onClick={() => setReportOpen(true)}
            disabled={accountInfo?.hasReported}
          >
            {accountInfo?.hasReported ? t("report.alreadyReported") : t("report.button")}
          </button>
        )}
      </div>

      <Modal open={takedownOpen} onClose={() => setTakedownOpen(false)} title={t("takedown.title")}>
        <CancelForm
          campaign={campaign}
          mode="admin"
          onDone={() => {
            setTakedownOpen(false);
            onChanged?.();
          }}
        />
      </Modal>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={t("report.title")}
        description={t("report.description")}
      >
        <ReportForm
          campaignAddress={campaign.address}
          onReported={() => {
            setReportOpen(false);
            onChanged?.();
          }}
        />
      </Modal>
    </div>
  );
};

export default ModerationPanel;
