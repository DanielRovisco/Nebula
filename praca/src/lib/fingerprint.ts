export interface FingerprintInput {
  type: string;
  typology?: number | null;
  usableArea?: number | null; // accepted for convenience, not part of the key
  floor?: number | null;
  lat: number;
  lng: number;
}

/**
 * Coarse, deterministic key for exact-bucket candidate lookup during dedupe.
 * Coordinates are rounded to ~110 m (3 decimals), so the same property advertised twice with small
 * geocoding differences usually lands in the same bucket. Area is deliberately not part of the key
 * (bucket edges would split twins); it is a scoring signal in dedupe.ts. Candidates that miss the
 * bucket are still found through PostGIS ST_DWithin, so the key is only a fast path.
 */
export function fingerprint(p: FingerprintInput): string {
  return [
    p.type,
    p.typology ?? "x",
    p.floor ?? "x",
    p.lat.toFixed(3),
    p.lng.toFixed(3),
  ].join("|");
}
