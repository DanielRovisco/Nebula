import { describe, expect, it } from "vitest";
import { estimateFromComparables, weightedQuantile } from "./estimate";

const mk = (vals: number[]) => vals.map((v) => ({ pricePerM2: v, weight: 1 }));

describe("estimateFromComparables", () => {
  it("returns null with too few comparables", () => {
    expect(estimateFromComparables(mk([3000, 3100, 3200]), 80)).toBeNull();
  });
  it("estimates value and a sane interval", () => {
    const e = estimateFromComparables(mk([2800, 2900, 3000, 3100, 3200, 3300, 3400]), 100)!;
    expect(e.pricePerM2).toBe(3100);
    expect(e.value).toBe(310000);
    expect(e.low).toBeLessThan(e.value);
    expect(e.high).toBeGreaterThan(e.value);
  });
  it("is robust to one wild outlier", () => {
    const base = estimateFromComparables(mk([3000, 3050, 3100, 3150, 3200, 3250]), 100)!;
    const withOutlier = estimateFromComparables(mk([3000, 3050, 3100, 3150, 3200, 3250, 9000]), 100)!;
    expect(Math.abs(withOutlier.pricePerM2 - base.pricePerM2)).toBeLessThan(120);
  });
  it("tight, numerous samples give higher confidence than few, dispersed ones", () => {
    const good = estimateFromComparables(mk(Array.from({ length: 25 }, (_, i) => 3000 + i * 10)), 90)!;
    const poor = estimateFromComparables(mk([1500, 2500, 3500, 4500, 5500]), 90)!;
    expect(good.confidence).toBeGreaterThan(poor.confidence);
    expect(good.level).toBe("high");
  });
  it("weights matter", () => {
    const q = weightedQuantile([{ pricePerM2: 1000, weight: 0.1 }, { pricePerM2: 2000, weight: 5 }], 0.5);
    expect(q).toBeGreaterThan(1900);
  });
});
