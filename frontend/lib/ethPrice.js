import { useEffect, useState } from "react";

// Kurs ETH -> IDR dari CoinGecko (tanpa API key). Di-cache 5 menit, dipakai bersama semua komponen.
const PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=idr";
const CACHE_KEY = "eth-idr-price";
const CACHE_TTL = 5 * 60 * 1000;

let cached = null; // { price, fetchedAt }
let inFlight = null;

const readStorage = () => {
  try {
    const value = JSON.parse(localStorage.getItem(CACHE_KEY));
    return value && Date.now() - value.fetchedAt < CACHE_TTL ? value : null;
  } catch (error) {
    return null;
  }
};

const fetchPrice = async () => {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.price;
  cached = cached || readStorage();
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached.price;

  if (!inFlight) {
    inFlight = fetch(PRICE_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((data) => {
        cached = { price: data.ethereum.idr, fetchedAt: Date.now() };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        } catch (error) {
          /* abaikan */
        }
        return cached.price;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

// null = kurs belum tersedia / gagal dimuat (nilai Rupiah disembunyikan)
export const useEthIdrPrice = () => {
  const [price, setPrice] = useState(cached?.price ?? null);

  useEffect(() => {
    let active = true;
    fetchPrice()
      .then((value) => active && setPrice(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return price;
};

export const formatIdr = (eth, price) => {
  const value = Number(eth || 0) * price;
  const compact = value >= 1000000;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
};
