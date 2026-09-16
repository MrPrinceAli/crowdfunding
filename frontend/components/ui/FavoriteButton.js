import { useFavorites } from "../../lib/favorites";
import { useI18n } from "../providers/PreferencesProvider";

/** Tombol ♥ untuk menandai kampanye favorit (tersimpan di browser) */
const FavoriteButton = ({ address, className = "" }) => {
  const { t } = useI18n();
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(address);

  return (
    <button
      type="button"
      onClick={(event) => {
        // Di dalam kartu yang berupa link: jangan ikut membuka halaman kampanye
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(address);
      }}
      aria-pressed={active}
      aria-label={active ? t("favorite.remove") : t("favorite.add")}
      title={active ? t("favorite.remove") : t("favorite.add")}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm transition hover:scale-110 dark:bg-slate-900/90 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        fill={active ? "currentColor" : "none"}
        className={`h-5 w-5 ${active ? "text-rose-500" : "text-slate-500 dark:text-slate-300"}`}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </svg>
    </button>
  );
};

export default FavoriteButton;
