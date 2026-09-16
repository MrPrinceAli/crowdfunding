import { useState } from "react";
import { EXPLORER_URL } from "../../lib/config";
import { formatDate, formatDateTime, formatEth } from "../../lib/format";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import { ListIcon } from "../ui/Icons";
import Loader from "../ui/Loader";
import { ChangeList } from "./EditHistory";

const INITIAL_COUNT = 10;

const FILTERS = {
  all: null,
  donations: ["donation", "refund"],
  withdrawals: ["withdrawRequested", "approved", "rejected", "cancelled", "withdrawn"],
  updates: [
    "created",
    "edited",
    "extended",
    "closed",
    "campaignCancelled",
    "takenDown",
    "update",
    "reported",
    "verified",
    "unverified",
  ],
};

const DOT_COLOR = {
  donation: "bg-emerald-500",
  refund: "bg-emerald-500",
  withdrawn: "bg-amber-500",
  withdrawRequested: "bg-amber-400",
  approved: "bg-sky-500",
  rejected: "bg-rose-500",
  cancelled: "bg-slate-400",
  reported: "bg-rose-500",
  verified: "bg-sky-500",
  closed: "bg-slate-500",
  campaignCancelled: "bg-rose-500",
  takenDown: "bg-rose-600",
};

const ActivityItem = ({ item, label }) => {
  const { t } = useI18n();
  const [showChanges, setShowChanges] = useState(false);
  const vars = {
    actor: label(item.actor),
    amount: formatEth(item.amount),
    id: item.requestId !== undefined ? item.requestId + 1 : "",
    date: item.deadline ? formatDate(item.deadline) : "",
  };

  return (
    <li className="relative">
      <span
        className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${
          DOT_COLOR[item.type] ?? "bg-slate-400"
        }`}
      />
      <p className="text-strong text-sm">{t(`activity.${item.type}`, vars)}</p>
      {item.text && (
        <p className="text-body mt-0.5 line-clamp-3 whitespace-pre-line break-words text-sm">“{item.text}”</p>
      )}
      {item.type === "edited" && item.changes?.length > 0 && (
        <>
          <button
            type="button"
            className="text-accent mt-1 text-xs font-semibold hover:underline"
            aria-expanded={showChanges}
            onClick={() => setShowChanges(!showChanges)}
          >
            {showChanges ? t("editHistory.hideChanges") : t("editHistory.showChanges", { count: item.changes.length })}
          </button>
          {showChanges && (
            <div className="surface-muted mt-2 rounded-xl p-3">
              <ChangeList changes={item.changes} />
            </div>
          )}
        </>
      )}
      <p className="text-faint mt-0.5 flex flex-wrap gap-x-2 text-xs">
        <span>{formatDateTime(item.time)}</span>
        {EXPLORER_URL && (
          <a
            href={`${EXPLORER_URL}/tx/${item.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            {t("activity.viewTx")} ↗
          </a>
        )}
      </p>
    </li>
  );
};

/** Timeline semua kejadian kampanye, tercatat di blockchain */
const ActivityTimeline = ({ activity }) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = (activity || []).filter((item) => !FILTERS[filter] || FILTERS[filter].includes(item.type));
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_COUNT);
  const { label } = useIdentity(visible.map((item) => item.actor));

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListIcon className="text-faint h-5 w-5" />
          <h2 className="text-strong text-lg font-bold">{t("activity.title")}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.keys(FILTERS).map((key) => (
            <button
              key={key}
              className={`chip px-3 py-1 ${filter === key ? "chip-active" : ""}`}
              onClick={() => {
                setFilter(key);
                setShowAll(false);
              }}
            >
              {t(`activity.filter.${key}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {!activity ? (
          <Loader label={t("activity.loading")} />
        ) : filtered.length === 0 ? (
          <p className="text-muted text-sm">{t("activity.empty")}</p>
        ) : (
          <ol className="relative space-y-5 border-l border-slate-200 pl-6 dark:border-slate-800">
            {visible.map((item) => (
              <ActivityItem key={item.id} item={item} label={label} />
            ))}
          </ol>
        )}
      </div>

      {filtered.length > INITIAL_COUNT && (
        <button className="btn-secondary mt-5 w-full py-2 text-xs" onClick={() => setShowAll(!showAll)}>
          {showAll ? t("common.showLess") : t("activity.showAll", { count: filtered.length })}
        </button>
      )}
    </div>
  );
};

export default ActivityTimeline;
