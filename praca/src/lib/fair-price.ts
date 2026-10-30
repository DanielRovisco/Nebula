export type FairVerdict = "below" | "fair" | "above";

export interface FairPrice {
  verdict: FairVerdict;
  /** Asking price relative to the model value, e.g. 0.08 = 8 % above. */
  deviation: number;
  value: number;
  low: number;
  high: number;
  confidence: number;
  n: number;
}

/** Minimum comparables and confidence before a verdict is shown. Below that the page shows nothing rather than guess. */
export const FAIR_MIN_N = 8;

/**
 * Compares an asking price with the AVM interval. Inside [low, high] the price is "fair"; outside it is "below" or "above".
 * Returns null when the sample is too thin or the model has low confidence.
 */
export function classifyFairPrice(price: number, m: { value: number; low: number; high: number; confidence: number; level: "low" | "medium" | "high"; n: number } | null): FairPrice | null {
  if (!m || !(price > 0) || !(m.value > 0) || m.n < FAIR_MIN_N || m.level === "low") return null;
  const verdict: FairVerdict = price < m.low ? "below" : price > m.high ? "above" : "fair";
  return { verdict, deviation: (price - m.value) / m.value, value: m.value, low: m.low, high: m.high, confidence: m.confidence, n: m.n };
}
