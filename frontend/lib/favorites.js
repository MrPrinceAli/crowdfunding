import { useCallback, useEffect, useState } from "react";

// Kampanye favorit disimpan di browser (per perangkat), bukan di blockchain
const KEY = "crowdfunding-favorites";
const EVENT = "crowdfunding-favorites-change";

const readFavorites = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const useFavorites = () => {
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    const sync = () => setFavorites(readFavorites());
    sync();
    // Sinkron antar komponen di halaman yang sama dan antar tab
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleFavorite = useCallback((address) => {
    const current = readFavorites();
    const key = address.toLowerCase();
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage diblokir: favorit hanya berlaku sampai halaman dimuat ulang
    }
    setFavorites(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const isFavorite = useCallback((address) => favorites.includes(address?.toLowerCase()), [favorites]);

  return { favorites, isFavorite, toggleFavorite };
};
