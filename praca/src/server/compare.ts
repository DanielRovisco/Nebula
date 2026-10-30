import { getPropertyByReference, getZoneStats, type PropertyDetail, type ZoneStats } from "./properties";

export interface CompareColumn {
  p: PropertyDetail;
  zone: ZoneStats | null;
  days: number;
}

/** Loads up to four properties (by reference) for the side-by-side table, skipping unknown references. */
export async function loadComparison(refs: string[]): Promise<CompareColumn[]> {
  const unique = [...new Set(refs.map((r) => r.trim().toUpperCase()).filter((r) => /^PR-\d{6}$/.test(r)))].slice(0, 4);
  const cols = await Promise.all(
    unique.map(async (r) => {
      const p = await getPropertyByReference(r);
      if (!p) return null;
      const zone = await getZoneStats(p).catch(() => null);
      return { p, zone, days: Math.max(0, Math.round((Date.now() - new Date(p.primary.publishedAt).getTime()) / 86_400_000)) };
    }),
  );
  return cols.filter((c): c is CompareColumn => c !== null);
}
