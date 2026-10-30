import { describe, expect, it } from "vitest";
import { pearson, toIndex } from "./stats";

describe("pearson", () => {
  it("is 1 for a perfect line and -1 for its inverse", () => {
    expect(pearson([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
    expect(pearson([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1, 10);
  });
  it("is null without variance or with too few points", () => {
    expect(pearson([1, 1, 1], [1, 2, 3])).toBeNull();
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });
});

describe("toIndex", () => {
  it("rebases to 100", () => {
    const r = toIndex([200, 220, 180]);
    expect(r[0]).toBe(100);
    expect(r[1]).toBeCloseTo(110, 8);
    expect(r[2]).toBeCloseTo(90, 8);
  });
});
