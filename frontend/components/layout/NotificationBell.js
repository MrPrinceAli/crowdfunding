import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useBlockRefresh } from "../../hooks/useBlockRefresh";
import { useNow } from "../../hooks/useNow";
import { useFavorites } from "../../lib/favorites";
import { formatDate, formatDateTime, formatEth, formatTimeLeft } from "../../lib/format";
import {
  buildReminders,
  dismissReminders,
  loadNotifications,
  readDismissedReminders,
  readSeenOrder,
  saveSeenOrder,
} from "../../lib/notifications";
import { selectCampaigns } from "../../store/campaigns";
import { selectAccount } from "../../store/wallet";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";
import { BellIcon, ClockIcon } from "../ui/Icons";
import Loader from "../ui/Loader";
import { reportError } from "../../lib/log";

/** Lonceng notifikasi: aktivitas terbaru dari kampanye milik, didukung, atau difavoritkan akun */
const NotificationBell = () => {
  const { t } = useI18n();
  const account = useSelector(selectAccount);
  const campaigns = useSelector(selectCampaigns);
  const { favorites } = useFavorites();
  const [items, setItems] = useState(null);
  const [seenOrder, setSeenOrder] = useState(0);
  const [dismissed, setDismissed] = useState([]);
  const now = useNow(60000);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { label } = useIdentity((items || []).map((item) => item.actor));

  const favoritesKey = favorites.join(",");
  const reload = useCallback(() => {
    if (!account || !campaigns) return;
    loadNotifications({ account, campaigns, favorites: favoritesKey ? favoritesKey.split(",") : [] })
      .then(setItems)
      .catch((error) => {
        reportError("Memuat notifikasi", error);
        setItems((current) => current || []);
      });
  }, [account, campaigns, favoritesKey]);

  useEffect(() => {
    if (!account) return;
    setSeenOrder(readSeenOrder(account));
    setDismissed(readDismissedReminders(account));
  }, [account]);

  useEffect(reload, [reload]);
  useBlockRefresh(reload, 5000);

  // Tutup saat klik di luar panel atau menekan Escape
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!account) return null;

  const reminders = buildReminders({ account, campaigns, favorites, now });
  const unreadReminders = reminders.filter((reminder) => !dismissed.includes(reminder.id));
  const unreadCount = (items || []).filter((item) => item.order > seenOrder).length + unreadReminders.length;

  const markAllRead = () => {
    const latest = items?.[0]?.order ?? seenOrder;
    saveSeenOrder(account, latest);
    setSeenOrder(latest);
    setDismissed(
      dismissReminders(
        account,
        reminders.map((reminder) => reminder.id),
      ),
    );
  };

  const describe = (item) =>
    t(`notification.${item.type}`, {
      actor: label(item.actor),
      amount: formatEth(item.amount),
      id: item.requestId !== undefined ? item.requestId + 1 : "",
      date: item.deadline ? formatDate(item.deadline) : "",
    });

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="text-body relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label={unreadCount > 0 ? t("notification.buttonUnread", { count: unreadCount }) : t("notification.button")}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="card absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden shadow-xl">
          <div className="divider flex items-center justify-between gap-3 border-b px-4 py-3">
            <p className="text-strong font-bold">{t("notification.title")}</p>
            {unreadCount > 0 && (
              <button type="button" className="text-accent text-xs font-semibold hover:underline" onClick={markAllRead}>
                {t("notification.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {reminders.length > 0 && (
              <ul className="divider divide-y divide-slate-100 border-b dark:divide-slate-800">
                {reminders.map((reminder) => {
                  const unread = !dismissed.includes(reminder.id);
                  return (
                    <li key={reminder.id}>
                      <Link
                        href={`/project-details/${reminder.campaignAddress}`}
                        onClick={() => setOpen(false)}
                        className={`surface-hover flex gap-3 px-4 py-3 ${
                          unread ? "bg-amber-50/70 dark:bg-amber-500/5" : ""
                        }`}
                      >
                        <ClockIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                        <span className="min-w-0">
                          <span className="text-strong block text-sm">
                            {t("notification.endingSoon", { time: formatTimeLeft(reminder.deadline, now) })}
                          </span>
                          <span className="text-muted mt-0.5 block truncate text-xs">
                            {reminder.campaignTitle} · {formatDate(reminder.deadline)}
                          </span>
                          {unread && <span className="sr-only">{t("notification.unread")}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {!items ? (
              <Loader label={t("notification.loading")} />
            ) : items.length === 0 && reminders.length === 0 ? (
              <p className="text-muted px-4 py-8 text-center text-sm">{t("notification.empty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const unread = item.order > seenOrder;
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/project-details/${item.campaignAddress}`}
                        onClick={() => setOpen(false)}
                        className={`surface-hover flex gap-3 px-4 py-3 ${
                          unread ? "bg-emerald-50/60 dark:bg-emerald-500/5" : ""
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                            unread ? "bg-emerald-500" : "bg-transparent"
                          }`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="text-strong block text-sm">{describe(item)}</span>
                          <span className="text-muted mt-0.5 block truncate text-xs">
                            {item.campaignTitle} · {formatDateTime(item.time)}
                          </span>
                          {unread && <span className="sr-only">{t("notification.unread")}</span>}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
