import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { selectBlockNumber } from "../store/wallet";

/**
 * Jalankan `callback` setiap ada blok baru (transaksi dari siapa pun), dibatasi paling cepat
 * sekali per `minIntervalMs`. Dipakai untuk memperbarui data secara real-time.
 */
export const useBlockRefresh = (callback, minIntervalMs = 3000) => {
  const blockNumber = useSelector(selectBlockNumber);
  const lastRun = useRef(0);
  const timer = useRef(null);
  const latestCallback = useRef(callback);
  latestCallback.current = callback;

  useEffect(() => {
    if (!blockNumber) return undefined;
    const wait = Math.max(0, lastRun.current + minIntervalMs - Date.now());
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastRun.current = Date.now();
      latestCallback.current();
    }, wait);
    return () => clearTimeout(timer.current);
  }, [blockNumber, minIntervalMs]);
};
