import { toUtf8Bytes } from "ethers";
import { useState } from "react";
import { useTransaction } from "../../hooks/useTransaction";
import { MAX_NAME_BYTES } from "../../lib/campaign";
import { setDisplayName } from "../../lib/contracts";
import { toastError } from "../../lib/toast";
import { useIdentity } from "../providers/IdentityProvider";
import { useI18n } from "../providers/PreferencesProvider";

/** Panjang dalam byte UTF-8 (batas di contract dihitung per byte, emoji = 4 byte) */
export { MAX_NAME_BYTES };

export const byteLength = (text) => toUtf8Bytes(text).length;

/** Form mengubah nama tampilan akun sendiri (tersimpan di contract Crowdfunding) */
const DisplayNameForm = ({ currentName, onDone }) => {
  const { t } = useI18n();
  const { refreshNames } = useIdentity();
  const { run, isBusy } = useTransaction();
  const [name, setName] = useState(currentName || "");
  const bytes = byteLength(name.trim());

  const save = async (nextName) => {
    if (byteLength(nextName) > MAX_NAME_BYTES) return toastError(t("profile.errorLength", { max: MAX_NAME_BYTES }));
    const success = await run(
      "profile",
      (signer) => setDisplayName(signer, nextName),
      nextName ? t("profile.saved") : t("profile.removed"),
    );
    if (success) {
      await refreshNames();
      onDone?.();
    }
    return undefined;
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save(name.trim());
      }}
      className="space-y-4"
    >
      <div>
        <label className="label" htmlFor="display-name">
          {t("profile.nameLabel")}
        </label>
        <input
          id="display-name"
          className="input"
          value={name}
          placeholder={t("profile.namePlaceholder")}
          onChange={(event) => setName(event.target.value)}
          disabled={isBusy}
          autoComplete="off"
        />
        <p className={`mt-1 text-right text-xs ${bytes > MAX_NAME_BYTES ? "text-rose-600" : "text-faint"}`}>
          {bytes}/{MAX_NAME_BYTES}
        </p>
      </div>
      <p className="text-muted text-xs leading-relaxed">{t("profile.note")}</p>
      <button className="btn-primary w-full py-3" disabled={isBusy || bytes > MAX_NAME_BYTES}>
        {isBusy ? t("tx.waitingMetaMask") : t("profile.save")}
      </button>
      {currentName && (
        <button type="button" className="btn-secondary w-full" onClick={() => save("")} disabled={isBusy}>
          {t("profile.remove")}
        </button>
      )}
    </form>
  );
};

export default DisplayNameForm;
