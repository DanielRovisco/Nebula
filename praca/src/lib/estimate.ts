export interface Comparable {
  pricePerM2: number;
  /** 0..1 similarity weight (distance, typology, area, recency). */
  weight: number;
}

export interface Estimate {
  value: number;
  low: number;
  high: number;
  pricePerM2: number;
  n: number;
  /** 0..1 — grows with sample size, shrinks with dispersion. */
  confidence: number;
  level: "low" | "medium" | "high";
}

/** Weighted quantile: items sit at their mid cumulative-weight position; linear interpolation in between. */
export function weightedQuantile(items: Comparable[], q: number): number {
  const s = [...items].sort((a, b) => a.pricePerM2 - b.pricePerM2);
  const total = s.reduce((t, i) => t + i.weight, 0);
  if (!s.length || total <= 0) return NaN;
  let acc = 0;
  const pos = s.map((i) => {
    const p = (acc + i.weight / 2) / total;
    acc += i.weight;
    return p;
  });
  if (q <= pos[0]!) return s[0]!.pricePerM2;
  for (let i = 1; i < s.length; i++) {
    if (q <= pos[i]!) {
      const f = (q - pos[i - 1]!) / (pos[i]! - pos[i - 1]!);
      return s[i - 1]!.pricePerM2 + (s[i]!.pricePerM2 - s[i - 1]!.pricePerM2) * f;
    }
  }
  return s[s.length - 1]!.pricePerM2;
}

/**
 * Indicative value from similar adverts: similarity-weighted median €/m² × area, interval from the
 * weighted 25th–75th percentiles. Needs at least 5 comparables. Asking prices, so it estimates what
 * is *asked* for similar properties, not what they sell for. Full AVM/CMA with adjustments lives in
 * the Pro tier (docs/METHODOLOGY.md).
 */
export function estimateFromComparables(comps: Comparable[], area: number): Estimate | null {
  const valid = comps.filter((c) => Number.isFinite(c.pricePerM2) && c.pricePerM2 > 0 && c.weight > 0);
  if (valid.length < 5 || !(area > 0)) return null;
  const med = weightedQuantile(valid, 0.5);
  const lo = weightedQuantile(valid, 0.25);
  const hi = weightedQuantile(valid, 0.75);
  const dispersion = (hi - lo) / med; // relative IQR
  const sizeScore = Math.min(1, valid.length / 20);
  const spreadScore = Math.max(0, 1 - dispersion / 0.6);
  const confidence = Math.round((0.55 * sizeScore + 0.45 * spreadScore) * 100) / 100;
  return {
    value: Math.round((med * area) / 1000) * 1000,
    low: Math.round((lo * area) / 1000) * 1000,
    high: Math.round((hi * area) / 1000) * 1000,
    pricePerM2: Math.round(med),
    n: valid.length,
    confidence,
    level: confidence >= 0.7 ? "high" : confidence >= 0.45 ? "medium" : "low",
  };
}
