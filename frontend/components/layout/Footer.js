import { HandsIcon } from "../ui/Icons";
import { useI18n } from "../providers/PreferencesProvider";

const Footer = () => {
  const { t } = useI18n();
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="text-muted mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm sm:flex-row sm:px-6 lg:px-8">
        <div className="text-body flex items-center gap-2 font-semibold">
          <HandsIcon className="text-accent h-4 w-4" />
          Crowdfunding
        </div>
        <p>{t("footer.tagline")}</p>
      </div>
    </footer>
  );
};

export default Footer;
