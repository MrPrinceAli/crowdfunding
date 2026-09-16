import IdrValue from "./IdrValue";

/** Deretan kartu statistik; isi `eth` untuk menampilkan perkiraan Rupiah */
const StatGrid = ({ stats, className = "mt-8 grid-cols-3" }) => (
  <div className={`grid gap-3 sm:gap-4 ${className}`}>
    {stats.map((stat) => (
      <div key={stat.label} className="stat-tile">
        <p className="text-muted text-xs font-medium sm:text-sm">{stat.label}</p>
        <p className="text-strong mt-1 truncate text-lg font-extrabold sm:text-2xl">{stat.value}</p>
        {stat.eth !== undefined && stat.eth !== null && (
          <IdrValue eth={stat.eth} className="text-muted block truncate text-xs" />
        )}
        {stat.hint && <p className="text-muted mt-0.5 truncate text-xs">{stat.hint}</p>}
      </div>
    ))}
  </div>
);

export default StatGrid;
