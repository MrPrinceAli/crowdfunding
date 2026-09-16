import { useEffect, useRef, useState } from "react";

/** Lebar elemen yang ikut berubah saat layar di-resize (untuk grafik SVG responsif) */
export const useElementWidth = (initial = 600) => {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return [ref, width];
};
