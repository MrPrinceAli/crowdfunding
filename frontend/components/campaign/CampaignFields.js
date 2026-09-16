import { CATEGORIES, MAX_TEXT_LENGTH, MAX_URL_LENGTH, PROVINCES } from "../../lib/campaign";
import { useI18n } from "../providers/PreferencesProvider";
import CampaignCover from "./CampaignCover";

export const isValidImageUrl = (value) => !value || /^https?:\/\/\S+$/i.test(value);

/** Kolom yang dipakai bersama form buat & edit kampanye */
export const DescriptionField = ({ value, onChange }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="label" htmlFor="description">
        {t("form.description")}
      </label>
      <textarea
        id="description"
        rows={4}
        maxLength={MAX_TEXT_LENGTH}
        placeholder={t("form.descriptionPlaceholder")}
        className="input resize-none"
        value={value}
        onChange={onChange}
        required
      />
    </div>
  );
};

export const CategoryField = ({ value, onChange }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="label" htmlFor="category">
        {t("form.category")}
      </label>
      <select id="category" className="input" value={value} onChange={onChange}>
        {CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {t(`category.${category}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export const LocationField = ({ value, onChange }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="label" htmlFor="location">
        {t("form.location")}
      </label>
      <select id="location" className="input" value={value} onChange={onChange} required>
        <option value="" disabled>
          {t("form.locationPlaceholder")}
        </option>
        {PROVINCES.map((province) => (
          <option key={province} value={province}>
            {t(`province.${province}`)}
          </option>
        ))}
      </select>
    </div>
  );
};

export const ImageField = ({ value, onChange }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="label" htmlFor="image">
        {t("form.image")} <span className="text-faint font-normal">({t("common.optional")})</span>
      </label>
      <input
        id="image"
        type="url"
        maxLength={MAX_URL_LENGTH}
        placeholder="https://..."
        className="input"
        value={value}
        onChange={onChange}
      />
      {value && isValidImageUrl(value.trim()) && (
        <CampaignCover address="preview" imageUrl={value.trim()} className="mt-3 h-32 rounded-xl" />
      )}
    </div>
  );
};
