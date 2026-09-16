/** @jest-environment node */
import {
  APPROVALS,
  constellation,
  contract,
  dataWave,
  flow,
  flowValue,
  heart,
  seededRandom,
  sphere,
  voteBars,
  VOTERS,
  wallet,
} from "../../components/landing/shapes";

const SHAPES = { sphere, wallet, contract, flow, voteBars, dataWave, constellation, heart };

describe("landing shapes", () => {
  test.each(Object.entries(SHAPES))("%s menghasilkan N titik valid yang stabil antar frame", (_, shape) => {
    const points = shape(300)(1.5);
    expect(points).toHaveLength(300);
    points.forEach((point) => {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
      expect(Math.abs(point.x)).toBeLessThan(3);
      expect(Math.abs(point.y)).toBeLessThan(3);
      expect([0, 1, 2]).toContain(point.group);
    });
    // Bentuk yang sama pada waktu yang sama selalu menghasilkan titik yang sama (tidak berkedip)
    const generator = shape(300);
    expect(generator(2)).toEqual(generator(2));
  });

  test("seededRandom deterministik", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  test("voteBars: hanya 6 dari 10 batang yang menyala", () => {
    const litBars = new Set(
      voteBars(600)(0)
        .map((point, index) => (index % 12 !== 0 && point.group === 0 ? index % VOTERS : null))
        .filter((bar) => bar !== null),
    );
    expect([...litBars].sort((x, y) => x - y)).toEqual([...Array(APPROVALS).keys()]);
  });

  test("flowValue kontinu mengikuti posisi tengah layar, tanpa titik tahan", () => {
    const centers = [100, 500, 900];
    expect(flowValue(centers, 0)).toBe(0);
    expect(flowValue(centers, 100)).toBe(0);
    expect(flowValue(centers, 300)).toBeCloseTo(0.5);
    expect(flowValue(centers, 500)).toBeCloseTo(1);
    expect(flowValue(centers, 2000)).toBe(2);
    // Naik terus tanpa lompatan saat scroll bergerak sedikit demi sedikit
    let previous = -1;
    for (let y = 0; y <= 1000; y += 5) {
      const value = flowValue(centers, y);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value - Math.max(previous, 0)).toBeLessThan(0.05);
      previous = value;
    }
  });
});
