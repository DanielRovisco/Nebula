import { describe, expect, it } from "vitest";
import { binOf, projectFeatures, quantileBreaks } from "./choropleth";

describe("quantileBreaks / binOf", () => {
  it("splits values into quantile classes", () => {
    const vals = Array.from({ length: 100 }, (_, i) => i + 1);
    const b = quantileBreaks(vals, 5);
    expect(b.length).toBe(4);
    expect(binOf(1, b)).toBe(0);
    expect(binOf(100, b)).toBe(4);
    expect(binOf(null, b)).toBeNull();
  });
  it("collapses identical values", () => {
    expect(quantileBreaks([5, 5, 5, 5], 5)).toEqual([5]);
    expect(quantileBreaks([], 5)).toEqual([]);
  });
});

describe("projectFeatures", () => {
  it("fits geometry inside the box and flips y", () => {
    const sq = { type: "Polygon" as const, coordinates: [[[-9, 38], [-8, 38], [-8, 39], [-9, 39], [-9, 38]]] };
    const { paths } = projectFeatures([{ key: "a", name: "A", href: "/", value: 1, geometry: sq }], 400, 300);
    const nums = paths[0]!.d.match(/-?\d+\.\d/g)!.map(Number);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums)).toBeLessThanOrEqual(400);
    expect(paths[0]!.d.startsWith("M")).toBe(true);
  });
  it("handles an empty list", () => {
    expect(projectFeatures([], 100, 100).paths).toEqual([]);
  });
});
