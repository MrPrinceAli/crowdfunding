import { XIcon } from "./Icons";

const ErrorState = ({ title, description, action }) => (
  <div className="notice-rose flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center">
    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
      <XIcon />
    </span>
    <h3 className="text-strong text-base font-bold">{title}</h3>
    {description && <p className="text-body mt-1 max-w-md break-words text-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default ErrorState;
