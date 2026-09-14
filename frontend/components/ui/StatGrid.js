import IdrValue from "./IdrValue";

/** Deretan kartu statistik; isi `eth` untuk menampilkan perkiraan Rupiah */
const StatGrid = ({ stats }) => (
  <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
    {stats.map((stat) => (
      <div key={stat.label} className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 sm:p-5">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{stat.label}</p>
        <p className="mt-1 truncate text-lg font-extrabold text-slate-900 sm:text-2xl">{stat.value}</p>
        {stat.eth !== undefined && stat.eth !== null && (
          <IdrValue eth={stat.eth} className="block truncate text-xs text-slate-500" />
        )}
      </div>
    ))}
  </div>
);

export default StatGrid;
