/**
 * Bentuk partikel untuk landing page. Setiap bentuk mengembalikan N titik dalam ruang satuan
 * (pusat 0,0; radius kira-kira 1) beserta grup warna: 0 = neon, 1 = violet, 2 = redup.
 * Bentuk "dinamis" menerima waktu (detik) agar tetap hidup saat diam.
 */

/** PRNG deterministik agar bentuk sama di setiap render */
export const seededRandom = (seed) => {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

/**
 * Posisi cerita yang mengalir (tanpa titik tahan): indeks bab + progres menuju bab berikutnya,
 * dihitung dari posisi tengah tiap bab relatif terhadap tengah layar.
 * centers = posisi tengah tiap bab (px, relatif terhadap viewport), urut dari atas.
 */
export const flowValue = (centers, viewportCenter) => {
  if (centers.length === 0) return 0;
  if (viewportCenter <= centers[0]) return 0;
  for (let index = 0; index < centers.length - 1; index += 1) {
    const from = centers[index];
    const to = centers[index + 1];
    if (viewportCenter <= to) {
      const linear = to > from ? (viewportCenter - from) / (to - from) : 1;
      // Campuran linear & smoothstep: tetap kontinu, sedikit melambat di dekat tiap bab
      return index + (linear * 0.6 + smoothstep(0, 1, linear) * 0.4);
    }
  }
  return centers.length - 1;
};

/** Titik di sepanjang poligon/garis tertutup, dibagi sesuai panjang sisi */
const alongPolyline = (points, t) => {
  const segments = points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return { from: point, to: next, length: Math.hypot(next[0] - point[0], next[1] - point[1]) };
  });
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  let distance = (((t % 1) + 1) % 1) * total;
  for (const segment of segments) {
    if (distance <= segment.length) {
      const k = segment.length ? distance / segment.length : 0;
      return [
        segment.from[0] + (segment.to[0] - segment.from[0]) * k,
        segment.from[1] + (segment.to[1] - segment.from[1]) * k,
      ];
    }
    distance -= segment.length;
  }
  return points[0];
};

/** Bola fibonacci yang berputar (dengan kedalaman z untuk ukuran & terang titik) */
export const sphere = (count) => {
  const base = Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = Math.PI * (3 - Math.sqrt(5)) * i;
    return [Math.cos(theta) * radius, y, Math.sin(theta) * radius];
  });
  return (time) => {
    const a = time * 0.25;
    const tilt = 0.4;
    return base.map(([x, y, z], i) => {
      const rx = x * Math.cos(a) - z * Math.sin(a);
      const rz = x * Math.sin(a) + z * Math.cos(a);
      const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
      const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
      return { x: rx, y: ry, z: depth, group: i % 5 === 0 ? 1 : 0 };
    });
  };
};

/** Dompet: kartu bersudut membulat + gesper, sebagian titik berjalan di tepi */
export const wallet = (count) => {
  const random = seededRandom(11);
  const scatter = Array.from({ length: count }, () => [random(), random()]);
  const outline = [
    [-0.95, -0.6],
    [0.95, -0.6],
    [0.95, 0.6],
    [-0.95, 0.6],
  ];
  const flap = [
    [0.25, -0.2],
    [0.95, -0.2],
    [0.95, 0.2],
    [0.25, 0.2],
  ];
  return (time) =>
    Array.from({ length: count }, (_, i) => {
      const [r1, r2] = scatter[i];
      if (i % 10 < 6) {
        const [x, y] = alongPolyline(outline, i / (count * 0.6) + time * 0.02);
        return { x, y, z: 0, group: 0 };
      }
      if (i % 10 < 8) {
        const [x, y] = alongPolyline(flap, i / (count * 0.2) - time * 0.03);
        return { x, y, z: 0, group: 1 };
      }
      if (i % 10 === 8) {
        const angle = r1 * Math.PI * 2;
        return { x: 0.55 + Math.cos(angle) * 0.07, y: Math.sin(angle) * 0.07, z: 0, group: 0 };
      }
      return { x: (r1 - 0.5) * 1.7, y: (r2 - 0.5) * 1.05, z: 0, group: 2 };
    });
};

const hexagonPoints = (radius) =>
  Array.from({ length: 6 }, (_, index) => {
    const angle = (Math.PI / 3) * index - Math.PI / 2;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });

/** Smart contract: heksagon + cincin dana terkumpul yang terisi `fill` (0..1) */
export const contract = (count, fill = 0.72) => {
  const hex = hexagonPoints(0.55);
  return (time) =>
    Array.from({ length: count }, (_, i) => {
      if (i % 2 === 0) {
        const [x, y] = alongPolyline(hex, i / count + time * 0.015);
        return { x, y, z: 0, group: 0 };
      }
      const t = i / count;
      const angle = t * Math.PI * 2 - Math.PI / 2;
      const lit = t <= fill;
      return { x: Math.cos(angle) * 0.95, y: Math.sin(angle) * 0.95, z: 0, group: lit ? 1 : 2 };
    });
};

/** Donasi mengalir: koin bergerak di kurva dari kiri bawah menuju heksagon kecil di kanan atas */
export const flow = (count) => {
  const random = seededRandom(23);
  const offsets = Array.from({ length: count }, () => [random(), (random() - 0.5) * 0.08]);
  const hex = hexagonPoints(0.28);
  const start = [-1, 0.85];
  const control = [-0.9, -0.7];
  const end = [0.62, -0.5];
  return (time) =>
    Array.from({ length: count }, (_, i) => {
      if (i % 4 === 0) {
        const [x, y] = alongPolyline(hex, i / count);
        return { x: x + end[0], y: y + end[1], z: 0, group: 1 };
      }
      const [seed, jitter] = offsets[i];
      const u = (seed + time * 0.12) % 1;
      const x = (1 - u) ** 2 * start[0] + 2 * (1 - u) * u * control[0] + u ** 2 * end[0];
      const y = (1 - u) ** 2 * start[1] + 2 * (1 - u) * u * control[1] + u ** 2 * end[1];
      return { x: x + jitter, y: y + jitter, z: 0, group: 0 };
    });
};

export const VOTERS = 10;
export const APPROVALS = 6;

/** Voting: 10 batang, 6 menyala (setuju) melewati garis mayoritas 50%+1 */
export const voteBars = (count) => {
  const random = seededRandom(37);
  const scatter = Array.from({ length: count }, () => [random(), random()]);
  const barWidth = 0.13;
  const gap = 0.07;
  const left = -((VOTERS * barWidth + (VOTERS - 1) * gap) / 2);
  const lineX = left + APPROVALS * (barWidth + gap) - gap / 2;
  return (time) =>
    Array.from({ length: count }, (_, i) => {
      const [r1, r2] = scatter[i];
      if (i % 12 === 0) {
        // Garis putus-putus mayoritas 50%+1: titik hanya di segmen genap
        const y = -0.95 + r2 * 1.8;
        const dashed = Math.floor((y + 1) * 8) % 2 === 0 ? y : y + 0.12;
        return { x: lineX, y: dashed, z: 0, group: 1 };
      }
      const bar = i % VOTERS;
      const approved = bar < APPROVALS;
      const height = approved ? 1.55 + Math.sin(time * 2 + bar) * 0.03 : 0.35;
      // Sebaran vertikal merata (golden ratio) agar batang terlihat padat, bukan acak
      const level = (Math.floor(i / VOTERS) * 0.618034) % 1;
      return {
        x: left + bar * (barWidth + gap) + r1 * barWidth,
        y: 0.75 - level * height,
        z: 0,
        group: approved ? 0 : 2,
      };
    });
};

/** Statistik: matriks titik yang bergelombang (data hidup) */
export const dataWave = (count) => {
  const columns = Math.ceil(Math.sqrt(count * 2.2));
  const rows = Math.ceil(count / columns);
  return (time) =>
    Array.from({ length: count }, (_, i) => {
      const column = i % columns;
      const row = Math.floor(i / columns);
      const u = column / (columns - 1) - 0.5;
      const v = row / Math.max(1, rows - 1) - 0.5;
      const wave = Math.sin(u * 8 + time * 1.2) * Math.cos(v * 6 - time * 0.8) * 0.12;
      return { x: u * 2.4, y: v * 1.1 + wave, z: wave * 4, group: wave > 0.06 ? 0 : wave < -0.06 ? 1 : 2 };
    });
};

/** Fitur: rasi bintang yang melayang pelan */
export const constellation = (count) => {
  const random = seededRandom(53);
  const stars = Array.from({ length: count }, () => ({
    x: (random() - 0.5) * 3,
    y: (random() - 0.5) * 1.8,
    speed: 0.2 + random() * 0.6,
    phase: random() * Math.PI * 2,
    group: random() < 0.12 ? 0 : random() < 0.2 ? 1 : 2,
  }));
  return (time) =>
    stars.map((star) => ({
      x: star.x + Math.sin(time * star.speed * 0.3 + star.phase) * 0.04,
      y: star.y + Math.cos(time * star.speed * 0.25 + star.phase) * 0.04,
      z: Math.sin(time * star.speed + star.phase),
      group: star.group,
    }));
};

/** Hati: garis parametrik + isian, berdenyut pelan */
export const heart = (count) => {
  const random = seededRandom(71);
  const fill = Array.from({ length: count }, () => [random(), random()]);
  return (time) => {
    const beat = 1 + Math.max(0, Math.sin(time * 2.4)) ** 8 * 0.06;
    return Array.from({ length: count }, (_, i) => {
      const t = (i / count) * Math.PI * 2;
      let x = 16 * Math.sin(t) ** 3;
      let y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      let scale = 1;
      if (i % 3 === 2) scale = Math.sqrt(fill[i][0]) * 0.92;
      x = (x / 17) * scale * beat;
      y = (y / 17) * scale * beat + 0.08;
      return { x, y, z: 0, group: i % 3 === 2 ? 1 : 0 };
    });
  };
};
