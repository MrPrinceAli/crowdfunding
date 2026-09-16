import { useEffect, useState } from "react";

/** true jika pengguna memilih "kurangi animasi" di sistem operasinya */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
};

/** Angka yang naik dari 0 ke `target` saat `start` bernilai true */
export const useCountUp = (target, start, durationMs = 1400) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    let frame;
    const begin = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - begin) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, durationMs]);
  return value;
};
