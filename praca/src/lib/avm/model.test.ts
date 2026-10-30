import { describe, expect, it } from "vitest";
import { adjust, floorFactor, similarity, valuate, type Candidate, type Subject } from "./model";

const subject: Subject = { lat: 38.73, lng: -9.14, type: "apartment", typology: 2, area: 80, yearBuilt: 2005, condition: "used", floor: 3, elevator: true };
const mk = (over: Partial<Candidate> & { id: string }): Candidate => ({
  reference: "PR-000001", title: "x", kind: "active", price: 400000, pricePerM2: 5000, area: 80, typology: 2, yearBuilt: 2005, condition: "used", floor: 3, elevator: true, distanceM: 300, monthsAgo: 0, ...over,
});

describe("similarity", () => {
  it("is highest for an identical nearby active comparable", () => {
    expect(similarity(subject, mk({ id: "a", distanceM: 0 }), 2000)).toBeGreaterThan(0.95);
  });
  it("drops with distance, typology and area differences", () => {
    const near = similarity(subject, mk({ id: "a" }), 2000);
    expect(similarity(subject, mk({ id: "b", distanceM: 1800 }), 2000)).toBeLessThan(near);
    expect(similarity(subject, mk({ id: "c", typology: 4 }), 2000)).toBeLessThan(near);
    expect(similarity(subject, mk({ id: "d", area: 140 }), 2000)).toBeLessThan(near);
  });
  it("discounts old sold adverts", () => {
    expect(similarity(subject, mk({ id: "e", kind: "sold", monthsAgo: 10 }), 2000)).toBeLessThan(similarity(subject, mk({ id: "f" }), 2000));
  });
});

describe("adjust", () => {
  it("raises a to-renovate comparable to the subject's used condition", () => {
    const a = adjust(subject, mk({ id: "a", condition: "to_renovate" }));
    expect(a.condition).toBeGreaterThan(0.4);
    expect(a.factor).toBeGreaterThan(1.4);
  });
  it("is neutral for identical characteristics", () => {
    expect(adjust(subject, mk({ id: "a" })).factor).toBeCloseTo(1, 10);
  });
  it("floor factor: ground discount, lift premium capped", () => {
    expect(floorFactor(0, true)).toBeLessThan(1);
    expect(floorFactor(8, true)).toBe(floorFactor(6, true));
    expect(floorFactor(4, false)).toBeLessThan(floorFactor(4, true));
  });
});

describe("valuate", () => {
  it("returns null with too few comparables", () => {
    expect(valuate(subject, [mk({ id: "a" }), mk({ id: "b" })], 2000)).toBeNull();
  });
  it("estimates around the comparables' €/m² with an interval", () => {
    const cands = [4800, 4900, 5000, 5100, 5200, 5000, 4950].map((p, i) => mk({ id: String(i), pricePerM2: p, distanceM: 200 + i * 100 }));
    const r = valuate(subject, cands, 2000)!;
    expect(r.pricePerM2).toBeGreaterThan(4800);
    expect(r.pricePerM2).toBeLessThan(5200);
    expect(r.low).toBeLessThanOrEqual(r.value);
    expect(r.high).toBeGreaterThanOrEqual(r.value);
    expect(r.level).not.toBe("low");
  });
  it("ignores an outlier thanks to weighted quantiles and similarity", () => {
    const base = [4900, 5000, 5100, 5000, 4950, 5050].map((p, i) => mk({ id: String(i), pricePerM2: p }));
    const withOutlier = [...base, mk({ id: "x", pricePerM2: 12000, distanceM: 1800, area: 130, typology: 4 })];
    const a = valuate(subject, base, 2000)!;
    const b = valuate(subject, withOutlier, 2000)!;
    expect(Math.abs(b.pricePerM2 - a.pricePerM2)).toBeLessThan(150);
  });
  it("lower confidence for dispersed, distant comparables", () => {
    const tight = [5000, 5010, 4990, 5005, 4995, 5000].map((p, i) => mk({ id: `t${i}`, pricePerM2: p }));
    const loose = [3000, 6500, 4000, 7000, 3500, 5500].map((p, i) => mk({ id: `l${i}`, pricePerM2: p, distanceM: 1700, typology: 3 }));
    expect(valuate(subject, tight, 2000)!.confidence).toBeGreaterThan(valuate(subject, loose, 2000)!.confidence);
  });
});
