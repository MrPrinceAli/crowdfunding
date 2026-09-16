import Link from "next/link";
import { useState } from "react";
import { formatEth } from "../../lib/format";
import { useI18n } from "../providers/PreferencesProvider";
import AddressName, { Avatar } from "../ui/AddressName";
import { UsersIcon } from "../ui/Icons";
import Loader from "../ui/Loader";

const MEDALS = ["🥇", "🥈", "🥉"];
const TOP_COUNT = 5;

/** Daftar donatur, diurutkan dari donasi terbesar; 5 teratas ditonjolkan */
const ContributorList = ({ contributors, title }) => {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? contributors : contributors?.slice(0, TOP_COUNT);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-strong flex items-center gap-2 font-bold">
          <UsersIcon className="text-faint h-5 w-5" />
          {title || t("contributors.title")}
        </h2>
        <span className="badge-slate">{contributors?.length ?? 0}</span>
      </div>
      {contributors?.length > 1 && <p className="text-muted mt-1 text-xs">{t("contributors.sortedByAmount")}</p>}

      <div className="mt-4 max-h-[28rem] space-y-1 overflow-y-auto">
        {!contributors ? (
          <Loader label={t("contributors.loading")} />
        ) : contributors.length === 0 ? (
          <p className="text-muted py-6 text-center text-sm">{t("contributors.empty")}</p>
        ) : (
          visible.map(({ contributor, amount }, index) => (
            <Link
              key={contributor}
              href={`/creators/${contributor}`}
              className="surface-hover flex items-center gap-3 rounded-xl p-2"
            >
              <span className="w-6 text-center text-base" aria-hidden="true">
                {MEDALS[index] ?? <span className="text-faint text-xs font-semibold">{index + 1}</span>}
              </span>
              <Avatar address={contributor} />
              <p className="text-body min-w-0 flex-1 truncate text-sm">
                <AddressName address={contributor} />
              </p>
              <p className="text-strong text-sm font-bold">{formatEth(amount)}</p>
            </Link>
          ))
        )}
      </div>

      {contributors?.length > TOP_COUNT && (
        <button className="btn-secondary mt-3 w-full py-2 text-xs" onClick={() => setShowAll(!showAll)}>
          {showAll ? t("contributors.showTop") : t("contributors.showAll", { count: contributors.length })}
        </button>
      )}
    </div>
  );
};

export default ContributorList;
