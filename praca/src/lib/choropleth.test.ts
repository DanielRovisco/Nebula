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

describe("projectFeatures size", () => {
  it("drops sub-pixel points but keeps tiny zones clickable", async () => {
    const { projectFeatures } = await import("./choropleth");
    const dense = { type: "Polygon" as const, coordinates: [Array.from({ length: 400 }, (_, i) => [-9 + (i / 400) * 0.001, 38 + (i % 2) * 0.0000001]).concat([[-9, 38]])] };
    const big = { type: "Polygon" as const, coordinates: [[[-8, 37], [-6, 37], [-6, 41], [-8, 41], [-8, 37]]] };
    const tiny = { type: "Polygon" as const, coordinates: [[[-7, 39], [-6.99999, 39], [-6.99999, 39.00001], [-7, 39]]] };
    const { paths } = projectFeatures(
      [
        { key: "dense", name: "d", value: 1, href: "/", geometry: dense },
        { key: "big", name: "b", value: 1, href: "/", geometry: big },
        { key: "tiny", name: "t", value: 1, href: "/", geometry: tiny },
      ] as never,
      640,
      460,
    );
    expect(paths.find((p) => p.key === "tiny")!.d).toMatch(/^M[\d.]+ [\d.]+h1\.6v1\.6h-1\.6Z$/);
    expect(paths.find((p) => p.key === "big")!.d.split("L").length).toBe(4 + 1); // 4 corners kept (the closing point is a duplicate)
  });
});
