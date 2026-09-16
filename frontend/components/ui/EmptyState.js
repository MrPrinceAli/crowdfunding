const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900">
    {icon && (
      <span className="text-accent mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
        {icon}
      </span>
    )}
    <h3 className="text-strong text-base font-bold">{title}</h3>
    {description && <p className="text-muted mt-1 max-w-sm text-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
