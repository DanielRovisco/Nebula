export interface TaxBracket {
  upTo: number | null;
  rate: number; // fraction
  deduction: number;
  flat?: boolean;
}

/**
 * Progressive-with-deduction tables as published by the AT: tax = value × rate − deduction for the bracket the value
 * falls in; "flat" brackets apply the rate to the whole value. Tables come from the database (fiscal_tables), never from code.
 */
export function taxFromBrackets(value: number, brackets: TaxBracket[]): number {
  if (!(value > 0) || !brackets.length) return 0;
  const b = brackets.find((x) => x.upTo == null || value <= x.upTo) ?? brackets[brackets.length - 1]!;
  const tax = b.flat ? value * b.rate : value * b.rate - b.deduction;
  return Math.max(0, Math.round(tax * 100) / 100);
}

export interface MortgageInput {
  principal: number;
  /** Total annual rate, percent (Euribor + spread). */
  annualRatePct: number;
  years: number;
}

export interface MortgageResult {
  monthly: number;
  totalPaid: number;
  totalInterest: number;
}

export function mortgage({ principal, annualRatePct, years }: MortgageInput): MortgageResult {
  const n = Math.round(years * 12);
  if (!(principal > 0) || n <= 0) return { monthly: 0, totalPaid: 0, totalInterest: 0 };
  const r = annualRatePct / 100 / 12;
  const monthly = r === 0 ? principal / n : (principal * r) / (1 - Math.pow(1 + r, -n));
  const totalPaid = monthly * n;
  return { monthly: Math.round(monthly * 100) / 100, totalPaid: Math.round(totalPaid), totalInterest: Math.round(totalPaid - principal) };
}

/** Monthly effort rate: instalment as a share of net household income. */
export const effortRate = (monthly: number, netIncome: number) => (netIncome > 0 ? monthly / netIncome : 0);

/** Gross yield, as a fraction of the purchase price. */
export const grossYield = (monthlyRent: number, price: number) => (price > 0 ? (monthlyRent * 12) / price : 0);
