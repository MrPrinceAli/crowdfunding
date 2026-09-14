const Loader = ({ label = "Memuat data dari blockchain..." }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-slate-500">
    <span
      className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-emerald-600"
      role="status"
    />
    {label}
  </div>
);

export default Loader;
