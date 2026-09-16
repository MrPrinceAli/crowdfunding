import { formatIdr, useEthIdrPrice } from "../../lib/ethPrice";
import { useI18n } from "../providers/PreferencesProvider";

/** Perkiraan nilai Rupiah dari jumlah ETH; tidak tampil jika kurs belum tersedia */
const IdrValue = ({ eth, className = "text-faint text-xs", prefix = "≈ " }) => {
  const { t } = useI18n();
  const price = useEthIdrPrice();
  if (!price) return null;

  return (
    <span className={className} title={t("idr.tooltip")}>
      {prefix}
      {formatIdr(eth, price)}
    </span>
  );
};

export default IdrValue;
