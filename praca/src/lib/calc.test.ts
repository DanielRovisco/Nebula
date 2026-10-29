import { describe, expect, it } from "vitest";
import { grossYield, mortgage, taxFromBrackets, type TaxBracket } from "./calc";

const hpp: TaxBracket[] = [
  { upTo: 106346, rate: 0, deduction: 0 },
  { upTo: 145470, rate: 0.02, deduction: 2126.92 },
  { upTo: 198347, rate: 0.05, deduction: 6491.02 },
  { upTo: 330539, rate: 0.07, deduction: 10457.96 },
  { upTo: 660982, rate: 0.08, deduction: 13763.35 },
  { upTo: 1150853, rate: 0.06, deduction: 0, flat: true },
  { upTo: null, rate: 0.075, deduction: 0, flat: true },
];

describe("taxFromBrackets", () => {
  it("is zero below the first threshold", () => expect(taxFromBrackets(100000, hpp)).toBe(0));
  it("applies rate minus deduction", () => {
    expect(taxFromBrackets(300000, hpp)).toBeCloseTo(300000 * 0.07 - 10457.96, 2);
    expect(taxFromBrackets(120000, hpp)).toBeCloseTo(120000 * 0.02 - 2126.92, 2);
  });
  it("applies a flat rate to the whole value", () => {
    expect(taxFromBrackets(800000, hpp)).toBe(48000);
    expect(taxFromBrackets(2000000, hpp)).toBe(150000);
  });
  it("is continuous at bracket edges (no negative or jumpy tax)", () => {
    const a = taxFromBrackets(145470, hpp);
    const b = taxFromBrackets(145471, hpp);
    expect(Math.abs(b - a)).toBeLessThan(10);
  });
  it("handles empty tables and non-positive values", () => {
    expect(taxFromBrackets(500000, [])).toBe(0);
    expect(taxFromBrackets(-5, hpp)).toBe(0);
  });
});

describe("mortgage", () => {
  it("matches a textbook annuity", () => {
    const r = mortgage({ principal: 200000, annualRatePct: 3.6, years: 30 });
    expect(r.monthly).toBeCloseTo(909.32, 1);
    expect(r.totalInterest).toBeGreaterThan(120000);
  });
  it("handles a zero rate", () => {
    expect(mortgage({ principal: 120000, annualRatePct: 0, years: 10 }).monthly).toBe(1000);
  });
  it("returns zeros for invalid input", () => {
    expect(mortgage({ principal: 0, annualRatePct: 3, years: 30 }).monthly).toBe(0);
  });
});

describe("grossYield", () => {
  it("is annual rent over price", () => expect(grossYield(1000, 240000)).toBeCloseTo(0.05, 5));
});
