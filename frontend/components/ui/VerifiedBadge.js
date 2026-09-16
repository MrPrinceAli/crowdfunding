import { useI18n } from "../providers/PreferencesProvider";
import { CheckIcon } from "./Icons";

const VerifiedBadge = ({ className = "" }) => {
  const { t } = useI18n();
  return (
    <span className={`badge-sky gap-1 ${className}`} title={t("moderation.verifiedTooltip")}>
      <CheckIcon className="h-3.5 w-3.5" />
      {t("moderation.verified")}
    </span>
  );
};

export default VerifiedBadge;
