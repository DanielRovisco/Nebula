import { taxFromBrackets, type TaxBracket } from "./calc";

const r2 = (n: number) => Math.round(n * 100) / 100;

export type PurchaseKind = "hpp" | "secondary" | "other";

export interface PurchaseTables {
  hpp: TaxBracket[] | null;
  secondary: TaxBracket[] | null;
  other: TaxBracket[] | null;
  /** [first limit, second limit] of the IMT Jovem table. */
  jovem: [number, number] | null;
  stampPurchase: TaxBracket[] | null;
}

export interface PurchaseCosts {
  imt: number;
  stamp: number;
  total: number;
  jovemApplied: boolean;
}

/**
 * IMT + selo on a purchase. IMT Jovem (HPP only): exempt up to the first limit; between the limits the HPP marginal
 * rate applies only to the excess; above the second limit the normal table applies in full.
 */
export function purchaseCosts(price: number, kind: PurchaseKind, tables: PurchaseTables, jovem = false): PurchaseCosts {
  const table = kind === "hpp" ? tables.hpp : kind === "secondary" ? tables.secondary : tables.other;
  let imt = table ? taxFromBrackets(price, table) : 0;
  let jovemApplied = false;
  if (jovem && kind === "hpp" && tables.hpp && tables.jovem) {
    const [l1, l2] = tables.jovem;
    if (price <= l1) {
      imt = 0;
      jovemApplied = true;
    } else if (price <= l2) {
      const b = tables.hpp.find((x) => x.upTo == null || price <= x.upTo) ?? tables.hpp[tables.hpp.length - 1]!;
      imt = r2((price - l1) * b.rate);
      jovemApplied = true;
    }
  }
  // Stamp duty on the purchase also applies under IMT Jovem (only IMT is exempt).
  const stamp = tables.stampPurchase ? taxFromBrackets(price, tables.stampPurchase) : 0;
  return { imt, stamp, total: r2(imt + stamp), jovemApplied };
}

export interface CapitalGainsInput {
  salePrice: number;
  purchasePrice: number;
  /** Updating coefficient for the purchase year (>= 1). Taken from the AT table; 1 when unknown. */
  coefficient: number;
  /** Documented purchase/sale expenses (IMT, selo, works in the last 12 years, agency commission…). */
  expenses: number;
  /** Marginal IRS rate of the seller's household, percent. */
  marginalRatePct: number;
  /** Seller is a tax resident (50 % inclusion). Non-residents are taxed on 100 %. */
  resident: boolean;
  /** Sale of own permanent home with reinvestment: share of the sale proceeds reinvested (0–1), or null when not a HPP. */
  hppReinvestedShare: number | null;
}

export interface CapitalGainsResult {
  gain: number;
  taxableGain: number;
  exemptShare: number;
  tax: number;
  netProceeds: number;
}

export function capitalGains(i: CapitalGainsInput): CapitalGainsResult {
  const gain = Math.max(0, i.salePrice - Math.round(i.purchasePrice * Math.max(1, i.coefficient) * 100) / 100 - i.expenses);
  const exemptShare = i.hppReinvestedShare == null ? 0 : Math.min(1, Math.max(0, i.hppReinvestedShare));
  const included = gain * (1 - exemptShare) * (i.resident ? 0.5 : 1);
  const tax = r2(included * (i.marginalRatePct / 100));
  return { gain: r2(gain), taxableGain: r2(included), exemptShare, tax, netProceeds: r2(i.salePrice - tax) };
}

export interface RentalInput {
  price: number;
  monthlyRent: number;
  /** Months of vacancy per year. */
  vacancyMonths: number;
  /** IMI rate, percent of the tax asset value (VPT). */
  imiPct: number;
  /** VPT as a share of the price (default 0.6, user-editable). */
  vptShare: number;
  condoYearly: number;
  insuranceYearly: number;
  maintenancePct: number;
  /** Autonomous IRS rate on rents, fraction. */
  irsRate: number;
}

export interface RentalResult {
  grossYearly: number;
  imi: number;
  expenses: number;
  irs: number;
  netYearly: number;
  grossYield: number;
  netYield: number;
}

export function rentalReturn(i: RentalInput): RentalResult {
  const grossYearly = i.monthlyRent * Math.max(0, 12 - i.vacancyMonths);
  const imi = r2(i.price * i.vptShare * (i.imiPct / 100));
  const expenses = r2(i.condoYearly + i.insuranceYearly + grossYearly * (i.maintenancePct / 100));
  const irs = r2(grossYearly * i.irsRate);
  const netYearly = r2(grossYearly - imi - expenses - irs);
  return {
    grossYearly: r2(grossYearly),
    imi,
    expenses,
    irs,
    netYearly,
    grossYield: i.price > 0 ? (i.monthlyRent * 12) / i.price : 0,
    netYield: i.price > 0 ? netYearly / i.price : 0,
  };
}

/** Autonomous IRS rate for a lease of `years` (brackets keyed by years, all flat). */
export function rentIrsRate(years: number, brackets: TaxBracket[] | null): number {
  if (!brackets?.length) return 0.25;
  const b = brackets.find((x) => x.upTo == null || years <= x.upTo) ?? brackets[brackets.length - 1]!;
  return b.rate;
}

/** Debt-service ratio checks used by banks as a rule of thumb (Banco de Portugal macroprudential limit is 50 % DSTI). */
export function affordability(netMonthlyIncome: number, otherDebtMonthly: number, maxRatio: number) {
  const budget = Math.max(0, netMonthlyIncome * maxRatio - otherDebtMonthly);
  return { maxMonthlyPayment: r2(budget) };
}

/** Principal that a monthly payment can service (inverse of `mortgage`). */
export function principalFor(monthly: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (!(monthly > 0) || n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  return Math.round(r === 0 ? monthly * n : (monthly * (1 - Math.pow(1 + r, -n))) / r);
}
