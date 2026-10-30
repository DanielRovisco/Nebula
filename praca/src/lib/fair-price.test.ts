import { describe, expect, it } from "vitest";
import { classifyFairPrice } from "./fair-price";

const m = { value: 300000, low: 280000, high: 320000, confidence: 0.7, level: "high" as const, n: 12 };
describe("classifyFairPrice", () => {
  it("classifies against the interval", () => {
    expect(classifyFairPrice(250000, m)?.verdict).toBe("below");
    expect(classifyFairPrice(300000, m)?.verdict).toBe("fair");
    expect(classifyFairPrice(280000, m)?.verdict).toBe("fair");
    expect(classifyFairPrice(350000, m)?.verdict).toBe("above");
  });
  it("reports the deviation from the model value", () => expect(classifyFairPrice(330000, m)?.deviation).toBeCloseTo(0.1, 5));
  it("shows nothing for a thin or low-confidence model", () => {
    expect(classifyFairPrice(300000, { ...m, n: 7 })).toBeNull();
    expect(classifyFairPrice(300000, { ...m, level: "low" })).toBeNull();
    expect(classifyFairPrice(300000, null)).toBeNull();
  });
});
