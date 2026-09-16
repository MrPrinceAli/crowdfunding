import { useState } from "react";
import { formatDateTime } from "../../lib/format";
import { useI18n } from "../providers/PreferencesProvider";
import { PencilIcon } from "../ui/Icons";
import Modal from "../ui/Modal";

const FieldValue = ({ field, value, tone }) => {
  const { t } = useI18n();
  const toneClass =
    tone === "before"
      ? "bg-rose-50 text-rose-800 line-through decoration-rose-400/60 dark:bg-rose-500/10 dark:text-rose-200"
      : "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100";

  let content = value;
  if (!value) content = <span className="italic opacity-70">{t("editHistory.empty")}</span>;
  else if (field === "category") content = t(`category.${value}`);

  return (
    <p
      className={`whitespace-pre-line break-words rounded-lg px-3 py-2 text-sm ${toneClass} ${
        field === "imageUrl" ? "font-mono text-xs" : ""
      }`}
    >
      <span className="sr-only">{t(`editHistory.${tone}`)}: </span>
      {content}
    </p>
  );
};

/** Daftar perubahan satu kali edit: nilai lama (dicoret) dan nilai baru per field */
export const ChangeList = ({ changes }) => {
  const { t } = useI18n();
  if (!changes?.length) return <p className="text-muted text-sm">{t("editHistory.noChanges")}</p>;

  return (
    <dl className="space-y-3">
      {changes.map((change) => (
        <div key={change.field}>
          <dt className="text-muted text-xs font-semibold uppercase tracking-wide">
            {t(`editHistory.field.${change.field}`)}
          </dt>
          <dd className="mt-1 space-y-1">
            {change.before !== null && <FieldValue field={change.field} value={change.before} tone="before" />}
            <FieldValue field={change.field} value={change.after} tone="after" />
          </dd>
        </div>
      ))}
    </dl>
  );
};

/** Tautan "Diedit N kali" di bagian Tentang kampanye, membuka riwayat edit lengkap */
const EditHistory = ({ activity }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const edits = (activity || []).filter((item) => item.type === "edited");
  if (edits.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted mt-4 inline-flex items-center gap-1.5 text-xs font-semibold hover:text-slate-900 dark:hover:text-slate-100"
      >
        <PencilIcon className="h-3.5 w-3.5" />
        {t("editHistory.summary", { count: edits.length, date: formatDateTime(edits[0].time) })}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("editHistory.title")}
        description={t("editHistory.description")}
      >
        <ol className="space-y-6">
          {edits.map((edit, index) => (
            <li key={edit.id} className="divider border-t pt-5 first:border-t-0 first:pt-0">
              <p className="text-strong text-sm font-semibold">
                {t("editHistory.version", { number: edits.length - index })}{" "}
                <span className="text-muted font-normal">· {formatDateTime(edit.time)}</span>
              </p>
              <div className="mt-3">
                <ChangeList changes={edit.changes} />
              </div>
            </li>
          ))}
        </ol>
      </Modal>
    </>
  );
};

export default EditHistory;
