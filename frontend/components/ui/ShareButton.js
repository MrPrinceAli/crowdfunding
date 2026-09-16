import { useEffect, useRef, useState } from "react";
import { APP_URL } from "../../lib/config";
import { campaignUrl, shareLinks } from "../../lib/share";
import { toastSuccess } from "../../lib/toast";
import { useI18n } from "../providers/PreferencesProvider";
import { ShareIcon } from "./Icons";

const ShareButton = ({ address, title }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => setCanNativeShare(typeof navigator !== "undefined" && Boolean(navigator.share)), []);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => !menuRef.current?.contains(event.target) && setOpen(false);
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const url = campaignUrl(address, APP_URL);
  const links = shareLinks(url, title, t("share.message", { title }));

  const copyLink = async () => {
    await navigator.clipboard?.writeText(url);
    toastSuccess(t("share.copied"));
    setOpen(false);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // dibatalkan pengguna
    }
    setOpen(false);
  };

  const itemClass = "text-body block w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <div className="relative" ref={menuRef}>
      <button type="button" className="btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <ShareIcon className="h-4 w-4" />
        {t("share.button")}
      </button>

      {open && (
        <div className="card absolute right-0 z-30 mt-2 w-56 overflow-hidden py-1 text-sm shadow-lg">
          <button className={itemClass} onClick={copyLink}>
            {t("share.copy")}
          </button>
          {canNativeShare && (
            <button className={itemClass} onClick={nativeShare}>
              {t("share.native")}
            </button>
          )}
          {[
            ["WhatsApp", links.whatsapp],
            ["X / Twitter", links.x],
            ["Telegram", links.telegram],
            ["Facebook", links.facebook],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={itemClass}
              onClick={() => setOpen(false)}
            >
              {label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShareButton;
