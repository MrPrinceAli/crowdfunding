import { useEffect, useRef } from "react";
import { useI18n } from "../providers/PreferencesProvider";
import { XIcon } from "./Icons";

const Modal = ({ open, onClose, title, description, children }) => {
  const { t } = useI18n();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm dark:bg-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="text-faint absolute right-4 top-4 rounded-full p-2 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <span className="sr-only">{t("common.close")}</span>
          <XIcon />
        </button>
        <h2 className="text-strong pr-8 text-xl font-bold">{title}</h2>
        {description && <p className="text-muted mt-1 text-sm">{description}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
