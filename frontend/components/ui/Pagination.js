import { useI18n } from "../providers/PreferencesProvider";

const Pagination = ({ page, pageCount, onChange }) => {
  const { t } = useI18n();
  if (pageCount <= 1) return null;

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label={t("pagination.label")}>
      <button className="btn-secondary px-3 py-2" disabled={page === 1} onClick={() => onChange(page - 1)}>
        ← {t("pagination.previous")}
      </button>
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((number) => (
        <button
          key={number}
          onClick={() => onChange(number)}
          aria-current={number === page ? "page" : undefined}
          className={`h-10 w-10 rounded-xl text-sm font-semibold transition ${
            number === page ? "bg-emerald-600 text-white" : "text-body hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          {number}
        </button>
      ))}
      <button className="btn-secondary px-3 py-2" disabled={page === pageCount} onClick={() => onChange(page + 1)}>
        {t("pagination.next")} →
      </button>
    </nav>
  );
};

export default Pagination;
