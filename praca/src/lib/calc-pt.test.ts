import { describe, expect, it } from "vitest";
import { mortgage, type TaxBracket } from "./calc";
import { capitalGains, principalFor, purchaseCosts, rentalReturn, rentIrsRate, type PurchaseTables } from "./calc-pt";

const hpp: TaxBracket[] = [
  { upTo: 106346, rate: 0, deduction: 0 },
  { upTo: 145470, rate: 0.02, deduction: 2126.92 },
  { upTo: 198347, rate: 0.05, deduction: 6491.02 },
  { upTo: 330539, rate: 0.07, deduction: 10457.96 },
  { upTo: 660982, rate: 0.08, deduction: 13763.35 },
  { upTo: 1150853, rate: 0.06, deduction: 0, flat: true },
  { upTo: null, rate: 0.075, deduction: 0, flat: true },
];
const secondary: TaxBracket[] = [
  { upTo: 106346, rate: 0.01, deduction: 0 },
  { upTo: 145470, rate: 0.02, deduction: 1063.46 },
  { upTo: null, rate: 0.07, deduction: 9394.5 },
];
const tables: PurchaseTables = { hpp, secondary, other: [{ upTo: null, rate: 0.065, deduction: 0, flat: true }], jovem: [330539, 660982], stampPurchase: [{ upTo: null, rate: 0.008, deduction: 0, flat: true }] };

describe("purchaseCosts", () => {
  it("HPP 300k: IMT by bracket + 0.8 % stamp", () => {
    const c = purchaseCosts(300000, "hpp", tables);
    expect(c.imt).toBeCloseTo(300000 * 0.07 - 10457.96, 2);
    expect(c.stamp).toBe(2400);
    expect(c.total).toBeCloseTo(c.imt + 2400, 2);
  });
  it("secondary home pays 1 % from the first euro bracket", () => expect(purchaseCosts(100000, "secondary", tables).imt).toBe(1000));
  it("IMT Jovem exempts up to the first limit but keeps the stamp", () => {
    const c = purchaseCosts(300000, "hpp", tables, true);
    expect(c.imt).toBe(0);
    expect(c.stamp).toBe(2400);
    expect(c.jovemApplied).toBe(true);
  });
  it("IMT Jovem between limits taxes only the excess at the marginal rate", () => expect(purchaseCosts(400000, "hpp", tables, true).imt).toBeCloseTo((400000 - 330539) * 0.08, 2));
  it("IMT Jovem above the second limit does not apply", () => expect(purchaseCosts(700000, "hpp", tables, true).jovemApplied).toBe(false));
  it("IMT Jovem is ignored for non-HPP purchases", () => expect(purchaseCosts(200000, "secondary", tables, true).jovemApplied).toBe(false));
});

describe("capitalGains", () => {
  const base = { salePrice: 300000, purchasePrice: 200000, coefficient: 1, expenses: 10000, marginalRatePct: 40, resident: true, hppReinvestedShare: null };
  it("taxes 50 % of the gain for residents", () => {
    const r = capitalGains(base);
    expect(r.gain).toBe(90000);
    expect(r.taxableGain).toBe(45000);
    expect(r.tax).toBe(18000);
  });
  it("non-residents are taxed on the whole gain", () => expect(capitalGains({ ...base, resident: false }).taxableGain).toBe(90000));
  it("full HPP reinvestment exempts everything", () => expect(capitalGains({ ...base, hppReinvestedShare: 1 }).tax).toBe(0));
  it("partial reinvestment exempts a proportion", () => expect(capitalGains({ ...base, hppReinvestedShare: 0.5 }).tax).toBe(9000));
  it("never returns a negative gain", () => expect(capitalGains({ ...base, salePrice: 100000 }).gain).toBe(0));
  it("applies the updating coefficient to the purchase price", () => expect(capitalGains({ ...base, coefficient: 1.1 }).gain).toBe(70000));
});

describe("rentalReturn", () => {
  it("computes gross and net yield", () => {
    const r = rentalReturn({ price: 250000, monthlyRent: 1000, vacancyMonths: 1, imiPct: 0.3, vptShare: 0.6, condoYearly: 600, insuranceYearly: 200, maintenancePct: 5, irsRate: 0.25 });
    expect(r.grossYearly).toBe(11000);
    expect(r.imi).toBe(450);
    expect(r.expenses).toBe(600 + 200 + 550);
    expect(r.irs).toBe(2750);
    expect(r.netYearly).toBe(11000 - 450 - 1350 - 2750);
    expect(r.grossYield).toBeCloseTo(0.048, 4);
  });
  it("picks the autonomous rate by lease duration", () => {
    const b: TaxBracket[] = [{ upTo: 1.99, rate: 0.28, deduction: 0 }, { upTo: 4.99, rate: 0.26, deduction: 0 }, { upTo: null, rate: 0.1, deduction: 0 }];
    expect(rentIrsRate(1, b)).toBe(0.28);
    expect(rentIrsRate(3, b)).toBe(0.26);
    expect(rentIrsRate(30, b)).toBe(0.1);
    expect(rentIrsRate(3, null)).toBe(0.25);
  });
});

describe("principalFor", () => {
  it("inverts the mortgage payment", () => {
    const m = mortgage({ principal: 200000, annualRatePct: 4, years: 30 });
    expect(Math.abs(principalFor(m.monthly, 4, 30) - 200000)).toBeLessThan(50);
  });
});
