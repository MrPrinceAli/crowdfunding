import { useState } from "react";
import { formatEth, formatShortDate } from "../../lib/format";
import { useI18n } from "../providers/PreferencesProvider";
import AddressName, { Avatar } from "../ui/AddressName";
import { ChatIcon } from "../ui/Icons";
import Loader from "../ui/Loader";

const INITIAL_COUNT = 5;

/** Pesan & doa dari donatur (dikirim bersama donasi) */
const SupportMessages = ({ donations }) => {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const messages = (donations || []).filter((donation) => donation.message).reverse();
  const visible = showAll ? messages : messages.slice(0, INITIAL_COUNT);

  return (
    <div className="card p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <ChatIcon className="text-faint h-5 w-5" />
        <h2 className="text-strong text-lg font-bold">{t("messages.title")}</h2>
        {messages.length > 0 && <span className="badge-slate">{messages.length}</span>}
      </div>

      <div className="mt-5">
        {!donations ? (
          <Loader label={t("messages.loading")} />
        ) : messages.length === 0 ? (
          <p className="text-muted text-sm">{t("messages.empty")}</p>
        ) : (
          <ul className="space-y-4">
            {visible.map((donation) => (
              <li key={donation.txHash} className="flex gap-3">
                <Avatar address={donation.contributor} />
                <div className="surface-muted min-w-0 flex-1 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-muted flex flex-wrap items-center gap-x-2 text-xs">
                    <AddressName
                      address={donation.contributor}
                      href={`/creators/${donation.contributor}`}
                      className="text-body font-semibold hover:underline"
                    />
                    <span>·</span>
                    <span>{formatEth(donation.amount)}</span>
                    <span>·</span>
                    <span>{formatShortDate(donation.time, true)}</span>
                  </p>
                  <p className="text-body mt-1 whitespace-pre-line break-words text-sm">{donation.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {messages.length > INITIAL_COUNT && (
        <button className="btn-secondary mt-4 w-full py-2 text-xs" onClick={() => setShowAll(!showAll)}>
          {showAll ? t("common.showLess") : t("messages.showAll", { count: messages.length })}
        </button>
      )}
    </div>
  );
};

export default SupportMessages;
