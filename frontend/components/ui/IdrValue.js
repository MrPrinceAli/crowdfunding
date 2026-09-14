import { formatIdr, useEthIdrPrice } from "../../lib/ethPrice";

/** Perkiraan nilai Rupiah dari jumlah ETH; tidak tampil jika kurs belum tersedia */
const IdrValue = ({ eth, className = "text-xs text-slate-400", prefix = "≈ " }) => {
  const price = useEthIdrPrice();
  if (!price) return null;

  return (
    <span className={className} title="Perkiraan berdasarkan kurs ETH/IDR saat ini (CoinGecko)">
      {prefix}
      {formatIdr(eth, price)}
    </span>
  );
};

export default IdrValue;
