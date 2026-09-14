import { useEffect, useState } from "react";
import { nowInSeconds } from "../lib/format";

/** Waktu sekarang (detik) yang diperbarui berkala, untuk hitung mundur */
export const useNow = (intervalMs = 30000) => {
  const [now, setNow] = useState(nowInSeconds);

  useEffect(() => {
    const timer = setInterval(() => setNow(nowInSeconds()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
