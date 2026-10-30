import { weightedQuantile } from "../estimate";

export type Condition = "new" | "used" | "to_renovate" | "under_construction";
export type CompKind = "active" | "sold" | "rented";

export interface Subject {
  lat: number;
  lng: number;
  type: string;
  typology?: number | null;
  area: number;
  yearBuilt?: number | null;
  condition?: Condition | null;
  floor?: number | null;
  elevator?: boolean;
}

export interface Candidate {
  id: string;
  reference: string;
  title: string;
  kind: CompKind;
  price: number;
  pricePerM2: number;
  area: number;
  typology: number | null;
  yearBuilt: number | null;
  condition: Condition | null;
  floor: number | null;
  elevator: boolean;
  distanceM: number;
  monthsAgo: number; // for sold/rented: months since the listing ended; 0 for active
}

export interface Comparable extends Candidate {
  similarity: number;
  adjustments: { condition: number; floor: number; area: number };
  adjustedPpm: number;
  adjustedPrice: number;
}

/**
 * Model parameters. These are statistical modelling choices (documented in docs/METHODOLOGY.md),
 * not legal/fiscal values: they may be retuned from data without touching the structure.
 */
export const PARAMS = {
  weights: { distance: 0.3, typology: 0.2, area: 0.2, age: 0.1, condition: 0.1, recency: 0.1 },
  /** Multipliers of €/m² by condition, relative to "used". */
  conditionFactor: { new: 1.18, under_construction: 1.1, used: 1, to_renovate: 0.68 } as Record<Condition, number>,
  /** Per-floor premium with a lift (capped at floor 6); ground floor discount. */
  floorStep: 0.012,
  floorCap: 6,
  groundDiscount: 0.97,
  /** Smaller flats sell at a higher €/m²: ppm ∝ area^-elasticity. */
  areaElasticity: 0.08,
  minComparables: 5,
  targetComparables: 8,
  radiiM: [1000, 2000, 5000, 15000],
  /** Sold/rented adverts older than this are ignored. */
  maxMonths: 12,
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function floorFactor(floor: number | null | undefined, elevator: boolean | undefined): number {
  if (floor == null) return 1;
  if (floor <= 0) return PARAMS.groundDiscount;
  return 1 + PARAMS.floorStep * Math.min(floor, PARAMS.floorCap) * (elevator ? 1 : 0.2);
}

/** Similarity 0..1 between the subject and a candidate: distance, typology, area, age, condition and recency. */
export function similarity(s: Subject, c: Candidate, radiusM: number): number {
  const w = PARAMS.weights;
  const dist = clamp01(1 - c.distanceM / radiusM);
  const typ = s.typology == null || c.typology == null ? 0.5 : s.typology === c.typology ? 1 : Math.abs(s.typology - c.typology) === 1 ? 0.45 : 0;
  const area = clamp01(1 - Math.abs(c.area - s.area) / (0.35 * s.area));
  const age = s.yearBuilt == null || c.yearBuilt == null ? 0.5 : clamp01(1 - Math.abs(s.yearBuilt - c.yearBuilt) / 40);
  const order: Condition[] = ["to_renovate", "used", "new", "under_construction"];
  const cond = !s.condition || !c.condition ? 0.5 : s.condition === c.condition ? 1 : Math.abs(order.indexOf(s.condition) - order.indexOf(c.condition)) === 1 ? 0.5 : 0.1;
  const rec = c.kind === "active" ? 1 : clamp01(1 - c.monthsAgo / PARAMS.maxMonths) * 0.8;
  return w.distance * dist + w.typology * typ + w.area * area + w.age * age + w.condition * cond + w.recency * rec;
}

/** Brings a comparable's €/m² to the subject's characteristics (condition, floor, size). */
export function adjust(s: Subject, c: Candidate): Comparable["adjustments"] & { factor: number } {
  const sc = PARAMS.conditionFactor[s.condition ?? "used"];
  const cc = PARAMS.conditionFactor[c.condition ?? "used"];
  const condition = sc / cc;
  const floor = floorFactor(s.floor, s.elevator) / floorFactor(c.floor, c.elevator);
  const area = Math.pow(c.area / s.area, PARAMS.areaElasticity);
  return { condition: condition - 1, floor: floor - 1, area: area - 1, factor: condition * floor * area };
}

export interface ModelResult {
  value: number;
  low: number;
  high: number;
  pricePerM2: number;
  confidence: number;
  level: "low" | "medium" | "high";
  n: number;
  avgSimilarity: number;
  comparables: Comparable[];
}

/** Weighted-median valuation with quantile interval; null below the minimum number of comparables. */
export function valuate(s: Subject, candidates: Candidate[], radiusM: number): ModelResult | null {
  const comps: Comparable[] = candidates
    .map((c) => {
      const a = adjust(s, c);
      const adjustedPpm = c.pricePerM2 * a.factor;
      return { ...c, similarity: similarity(s, c, radiusM), adjustments: { condition: a.condition, floor: a.floor, area: a.area }, adjustedPpm, adjustedPrice: adjustedPpm * s.area };
    })
    .filter((c) => c.similarity > 0.2)
    .sort((a, b) => b.similarity - a.similarity);
  if (comps.length < PARAMS.minComparables) return null;

  const pts = comps.map((c) => ({ pricePerM2: c.adjustedPpm, weight: Math.max(0.02, c.similarity ** 2) }));
  const med = weightedQuantile(pts, 0.5);
  const lo = weightedQuantile(pts, 0.25);
  const hi = weightedQuantile(pts, 0.75);
  const iqr = (hi - lo) / med;
  const avgSim = comps.reduce((t, c) => t + c.similarity, 0) / comps.length;
  const confidence = Math.round((0.4 * Math.min(1, comps.length / 15) + 0.3 * (1 - Math.min(1, iqr / 0.5)) + 0.3 * avgSim) * 100) / 100;
  // The interval never collapses below ±4 %: a point estimate from few similar listings is not that precise.
  const floorLo = med * 0.96, floorHi = med * 1.04;
  const r = (n: number) => Math.round((n * s.area) / 1000) * 1000;
  return {
    value: r(med),
    low: r(Math.min(lo, floorLo)),
    high: r(Math.max(hi, floorHi)),
    pricePerM2: Math.round(med),
    confidence,
    level: confidence >= 0.7 ? "high" : confidence >= 0.45 ? "medium" : "low",
    n: comps.length,
    avgSimilarity: Math.round(avgSim * 100) / 100,
    comparables: comps,
  };
}
