import { distanceMeters } from "./geo-math";

export interface DedupeCandidate {
  type: string;
  typology?: number | null;
  usableArea?: number | null;
  floor?: number | null;
  lat: number;
  lng: number;
  address?: string | null;
  price?: number | null;
  /** 64-bit perceptual hashes as hex strings. */
  photoHashes?: string[];
}

export interface DedupeScore {
  score: number;
  signals: Record<string, number>;
  decision: "merge" | "review" | "distinct";
}

export const MERGE_THRESHOLD = 0.82;
export const REVIEW_THRESHOLD = 0.6;

/** Trigram set similarity (Jaccard) — mirrors Postgres pg_trgm closely enough for scoring in JS. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const n = ` ${s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
    const out = new Set<string>();
    for (let i = 0; i < n.length - 2; i++) out.add(n.slice(i, i + 3));
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}

export function hammingHex(a: string, b: string): number {
  let x = BigInt("0x" + a) ^ BigInt("0x" + b);
  let c = 0;
  while (x) {
    c += Number(x & 1n);
    x >>= 1n;
  }
  return c;
}

/** Share of photos in `a` that have a near-identical photo (Hamming ≤ 8/64) in `b`. */
export function photoOverlap(a: string[] = [], b: string[] = []): number {
  if (!a.length || !b.length) return 0;
  const matched = a.filter((h) => b.some((g) => hammingHex(h, g) <= 8)).length;
  return matched / Math.min(a.length, b.length);
}

const closeness = (diff: number, tolerance: number) => Math.max(0, 1 - diff / tolerance);

/**
 * Confidence that two adverts describe the same physical property. Hard gates (type, typology)
 * short-circuit; the rest is a weighted blend. ≥ MERGE_THRESHOLD merges automatically,
 * between the two thresholds goes to the admin review queue.
 */
export function scoreDuplicate(a: DedupeCandidate, b: DedupeCandidate): DedupeScore {
  if (a.type !== b.type) return { score: 0, signals: { type: 0 }, decision: "distinct" };
  if (a.typology != null && b.typology != null && a.typology !== b.typology) {
    return { score: 0, signals: { typology: 0 }, decision: "distinct" };
  }
  const dist = distanceMeters(a.lat, a.lng, b.lat, b.lng);
  const signals: Record<string, number> = {
    distance: closeness(dist, 150),
    area: a.usableArea && b.usableArea ? closeness(Math.abs(a.usableArea - b.usableArea) / Math.max(a.usableArea, b.usableArea), 0.08) : 0.5,
    floor: a.floor != null && b.floor != null ? (a.floor === b.floor ? 1 : 0) : 0.5,
    price: a.price && b.price ? closeness(Math.abs(a.price - b.price) / Math.max(a.price, b.price), 0.12) : 0.5,
    address: a.address && b.address ? trigramSimilarity(a.address, b.address) : 0.4,
    photos: photoOverlap(a.photoHashes, b.photoHashes),
  };
  const weights: Record<string, number> = { distance: 0.28, area: 0.22, floor: 0.1, price: 0.1, address: 0.15, photos: 0.15 };
  // Photo evidence only counts when both adverts have hashes; otherwise the other weights are renormalised.
  const hasPhotos = !!a.photoHashes?.length && !!b.photoHashes?.length;
  if (!hasPhotos) delete weights.photos;
  let score = 0;
  let total = 0;
  for (const k of Object.keys(weights)) {
    score += (signals[k] ?? 0) * weights[k]!;
    total += weights[k]!;
  }
  score /= total;
  // Photos are the strongest single evidence: ≥ 50 % shared photos nearly settles it.
  if (signals.photos! >= 0.5 && signals.distance! > 0.2) score = Math.max(score, 0.9);
  // Different building: far apart can never merge, whatever the rest says.
  if (dist > 400) score = Math.min(score, 0.4);
  const decision = score >= MERGE_THRESHOLD ? "merge" : score >= REVIEW_THRESHOLD ? "review" : "distinct";
  return { score: Math.round(score * 1000) / 1000, signals, decision };
}
