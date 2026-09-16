import Lenis from "lenis";
import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useScrollMotion";
import { useI18n } from "../providers/PreferencesProvider";
import { flowValue, smoothstep } from "./shapes";

const MOBILE_BREAKPOINT = 768;
const GROUP_ALPHA = [1, 0.95, 0.35];

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

const PALETTE_FALLBACK = { neon: "#10b981", violet: "#6d28d9", ink: "#0a0f0c", gold: "#f59e0b", rose: "#ec4899" };

/** Warna token landing dalam RGB, agar bisa di-interpolasi antar bab */
const readPalette = (element) => {
  const style = getComputedStyle(element);
  return Object.fromEntries(
    Object.entries(PALETTE_FALLBACK).map(([name, fallback]) => {
      const hex = (style.getPropertyValue(`--l-${name}`).trim() || fallback).replace("#", "");
      const value = parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
      return [name, [(value >> 16) & 255, (value >> 8) & 255, value & 255]];
    }),
  );
};

const mixColor = (a, b, t) => `rgb(${a.map((channel, i) => Math.round(lerp(channel, b[i], t))).join(",")})`;
const DEFAULT_COLORS = ["neon", "violet"];

/**
 * Cerita scroll yang mengalir: bab-bab berupa section biasa yang ikut bergulir (dengan parallax
 * halus), scroll dihaluskan Lenis, dan kanvas partikel tetap di belakang berubah bentuk secara
 * kontinu mengikuti posisi scroll. Navigasi bab di samping mengikuti bab yang sedang di tengah layar.
 *
 * chapters: [{ id, label, content, minHeight, sticky, motion }] untuk konten & navigasi (boleh berubah tiap render)
 *   - sticky: section tinggi yang kontennya mengatur sendiri bagian menempel (tanpa padding/centering)
 *   - motion: "parallax" = konten diberi parallax & fade otomatis; selain itu konten menganimasikan diri
 * engineChapters: [{ id, shape, layout: { desktop, mobile }, colors: [grup0, grup1] }], referensi stabil
 *
 * Setiap section mendapat CSS variable yang diperbarui per frame (tanpa re-render):
 *   --p  = 0 saat section mulai masuk dari bawah layar, 1 saat keluar di atas
 *   --ps = 0..1 selama bagian sticky menempel (atas section di atas layar -> bawah section di bawah layar)
 */
const FlowStory = ({ chapters, engineChapters, onChapterChange }) => {
  const { t, isDark } = useI18n();
  const reducedMotion = useReducedMotion();
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const sectionRefs = useRef([]);
  const contentRefs = useRef([]);
  const barRef = useRef(null);
  const lenisRef = useRef(null);
  const paletteRef = useRef(null);
  const [active, setActive] = useState(0);
  const count = chapters.length;
  const chaptersMotionRef = useRef([]);
  chaptersMotionRef.current = chapters.map((chapter) => chapter.motion);

  useEffect(() => {
    if (rootRef.current) paletteRef.current = readPalette(rootRef.current);
  }, [isDark]);

  useEffect(() => {
    onChapterChange?.(active);
  }, [active, onChapterChange]);

  // Scroll halus dengan inersia (touch tetap native)
  useEffect(() => {
    if (reducedMotion) return undefined;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
    lenisRef.current = lenis;
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  const shapeCache = useRef(new Map());
  const shapesFor = useCallback(
    (particleCount) => {
      if (!shapeCache.current.has(particleCount)) {
        shapeCache.current.set(
          particleCount,
          engineChapters.map((chapter) => chapter.shape(particleCount)),
        );
      }
      return shapeCache.current.get(particleCount);
    },
    [engineChapters],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    let frame = 0;
    let smoothed = 0;
    let lastActive = -1;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const pointer = { x: -9999, y: -9999, active: false };
    const start = performance.now();

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    const onPointerMove = (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = event.pointerType === "mouse";
    };

    const render = (now) => {
      frame = requestAnimationFrame(render);
      if (document.hidden) return;

      // Posisi cerita dari tengah tiap bab relatif ke tengah layar
      const rects = sectionRefs.current.map((section) => section?.getBoundingClientRect());
      if (rects.some((rect) => !rect)) return;
      const centers = rects.map((rect) => rect.top + rect.height / 2);
      const target = flowValue(centers, height / 2);
      smoothed = reducedMotion ? target : lerp(smoothed, target, 0.18);

      const rounded = Math.round(smoothed);
      if (rounded !== lastActive) {
        lastActive = rounded;
        setActive(rounded);
      }

      // Progres per section untuk animasi CSS tiap bab
      sectionRefs.current.forEach((section, k) => {
        const rect = rects[k];
        const enter = reducedMotion ? 1 : clamp((height - rect.top) / (height + rect.height));
        const pinned = reducedMotion ? 1 : clamp(-rect.top / Math.max(1, rect.height - height));
        section.style.setProperty("--p", enter.toFixed(4));
        section.style.setProperty("--ps", pinned.toFixed(4));
      });

      // Parallax halus konten: bergerak sedikit lebih lambat dari scroll & memudar di tepi layar
      if (!reducedMotion) {
        contentRefs.current.forEach((element, k) => {
          if (!element || chaptersMotionRef.current[k] !== "parallax") return;
          const offset = (centers[k] - height / 2) / height; // 0 saat bab di tengah layar
          const reach = rects[k].height / height;
          const fade = clamp(1.15 - Math.max(0, Math.abs(offset) - (reach - 1) / 2) * 1.3);
          element.style.transform = `translate3d(0, ${(offset * -70).toFixed(1)}px, 0)`;
          element.style.opacity = fade.toFixed(3);
        });
      }

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
      const pageProgress = clamp(window.scrollY / maxScroll);
      document.documentElement.style.setProperty("--page-progress", pageProgress.toFixed(4));
      if (barRef.current) barRef.current.style.transform = `scaleY(${(smoothed / (count - 1)).toFixed(4)})`;

      // Partikel
      const isMobile = width < MOBILE_BREAKPOINT;
      const particleCount = isMobile ? 520 : 960;
      const shapes = shapesFor(particleCount);
      const time = reducedMotion ? 0 : (now - start) / 1000;
      const index = Math.min(count - 2, Math.floor(smoothed));
      // Perubahan bentuk dipusatkan di tengah jarak antar bab agar tiap bentuk terlihat jelas lebih lama
      const morph = smoothstep(0.2, 0.8, clamp(smoothed - index));
      const layoutA = engineChapters[index].layout[isMobile ? "mobile" : "desktop"];
      const layoutB = engineChapters[index + 1].layout[isMobile ? "mobile" : "desktop"];
      const pointsA = shapes[index](time);
      const pointsB = morph > 0.001 ? shapes[index + 1](time) : pointsA;
      const unit = Math.min(width, height);
      const alpha = lerp(layoutA.alpha ?? 1, layoutB.alpha ?? 1, morph);
      const swirl = Math.sin(morph * Math.PI);

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = isDark ? "lighter" : "source-over";
      const paths = [new Path2D(), new Path2D(), new Path2D()];

      for (let i = 0; i < particleCount; i += 1) {
        const a = pointsA[i];
        const b = pointsB[i];
        const angle = i * 2.399 + time * 0.5;
        let x =
          lerp(layoutA.x * width + a.x * layoutA.scale * unit, layoutB.x * width + b.x * layoutB.scale * unit, morph) +
          Math.cos(angle) * swirl * 36;
        let y =
          lerp(
            layoutA.y * height + a.y * layoutA.scale * unit,
            layoutB.y * height + b.y * layoutB.scale * unit,
            morph,
          ) +
          Math.sin(angle) * swirl * 36;

        if (pointer.active) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 120 && dist > 0.001) {
            const push = (1 - dist / 120) ** 2 * 36;
            x += (dx / dist) * push;
            y += (dy / dist) * push;
          }
        }

        const z = lerp(a.z, b.z, morph);
        const size = (isMobile ? 1.5 : 1.8) + (z + 1) * 0.9;
        paths[morph < 0.5 ? a.group : b.group].rect(x - size / 2, y - size / 2, size, size);
      }

      const palette = paletteRef.current || readPalette(rootRef.current);
      paletteRef.current = palette;
      const colorsA = engineChapters[index].colors || DEFAULT_COLORS;
      const colorsB = engineChapters[index + 1].colors || DEFAULT_COLORS;
      const fills = [
        mixColor(palette[colorsA[0]], palette[colorsB[0]], morph),
        mixColor(palette[colorsA[1]], palette[colorsB[1]], morph),
        mixColor(palette.ink, palette.ink, 0),
      ];
      paths.forEach((path, group) => {
        context.globalAlpha = GROUP_ALPHA[group] * alpha;
        context.fillStyle = fills[group];
        context.fill(path);
      });
      context.globalAlpha = 1;
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.style.removeProperty("--page-progress");
    };
  }, [reducedMotion, engineChapters, count, shapesFor, isDark]);

  const goTo = (k) => {
    const section = sectionRefs.current[k];
    if (!section) return;
    // Tengah bab ke tengah layar (bab yang lebih tinggi dari layar: mulai dari atasnya)
    const offset = Math.max(0, (window.innerHeight - section.offsetHeight) / 2);
    if (lenisRef.current) lenisRef.current.scrollTo(section, { offset: -offset, duration: 1.6 });
    else section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  };

  return (
    <div ref={rootRef} className="relative">
      {/* Latar tetap: cahaya lembut, grid, dan kanvas partikel */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 50% at 70% 45%, var(--l-neon-soft), transparent 70%), radial-gradient(40% 40% at 15% 85%, var(--l-violet-soft), transparent 70%)",
        }}
      />
      <div className="l-grid pointer-events-none fixed inset-0 z-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

      <div className="relative z-10">
        {chapters.map((chapter, k) => (
          <section
            key={chapter.id}
            id={chapter.id}
            ref={(element) => {
              sectionRefs.current[k] = element;
            }}
            className={chapter.sticky ? "relative" : "relative flex items-center py-24"}
            style={{
              minHeight: reducedMotion && chapter.sticky ? "100vh" : chapter.minHeight || "100vh",
              "--p": 0,
              "--ps": 0,
            }}
          >
            <div
              ref={(element) => {
                contentRefs.current[k] = element;
              }}
              className={chapter.sticky ? "h-full w-full" : "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"}
              style={{
                willChange: reducedMotion || chapter.motion !== "parallax" ? undefined : "transform, opacity",
                height: chapter.sticky && !reducedMotion ? chapter.minHeight : undefined,
              }}
            >
              {chapter.content}
            </div>
          </section>
        ))}
      </div>

      {/* Navigasi bab */}
      <nav
        className="fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-end gap-3 sm:flex lg:right-6"
        aria-label={t("landing.chapterNav")}
      >
        <div className="l-line absolute bottom-0 right-[5px] top-0 w-px border-l" />
        <div
          ref={barRef}
          className="absolute right-[5px] top-0 h-full w-px origin-top"
          style={{ background: "var(--l-neon)", transform: "scaleY(0)" }}
        />
        {chapters.map((chapter, k) => (
          <button
            key={chapter.id}
            type="button"
            onClick={() => goTo(k)}
            className="group relative flex items-center gap-3"
            aria-label={chapter.label}
            aria-current={active === k ? "step" : undefined}
          >
            <span
              className="l-raised rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold opacity-0 shadow-sm transition group-hover:opacity-100"
              style={{
                color: active === k ? "var(--l-accent)" : "var(--l-muted)",
                opacity: active === k ? 1 : undefined,
              }}
            >
              {chapter.label}
            </span>
            <span
              className="relative h-[11px] w-[11px] rounded-full border-2 transition-all duration-300"
              style={{
                borderColor: active === k ? "var(--l-neon)" : "var(--l-line)",
                background: active === k ? "var(--l-neon)" : "var(--l-paper)",
                transform: active === k ? "scale(1.25)" : "none",
              }}
            />
          </button>
        ))}
      </nav>
    </div>
  );
};

export default FlowStory;
