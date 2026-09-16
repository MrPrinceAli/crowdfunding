import { useI18n } from "../providers/PreferencesProvider";

const Loader = ({ label }) => {
  const { t } = useI18n();
  return (
    <div className="text-muted flex flex-col items-center justify-center gap-3 py-12 text-sm">
      <span
        className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-500"
        role="status"
      />
      {label ?? t("common.loading")}
    </div>
  );
};

export default Loader;
