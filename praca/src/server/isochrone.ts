import { sql } from "@/db";
import { fallbackIsochrone, isoKey, type IsoMode } from "@/lib/isochrone";

export interface IsochroneResult {
  geojson: Record<string, unknown>;
  provider: "openrouteservice" | "approximation";
}

/**
 * Travel-time area. With ORS_API_KEY it asks openrouteservice (real road/path network) and caches the answer in the
 * database; without a key, or when the provider fails, it returns a straight-line circle flagged `approximate`.
 */
export async function getIsochrone(lat: number, lng: number, mode: IsoMode, minutes: number): Promise<IsochroneResult> {
  const key = isoKey(lat, lng, mode, minutes);
  const [hit] = await sql<{ geojson: Record<string, unknown>; provider: string }[]>`SELECT geojson, provider FROM isochrone_cache WHERE key = ${key}`;
  if (hit) return { geojson: hit.geojson, provider: hit.provider as IsochroneResult["provider"] };
  const apiKey = process.env.ORS_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(`https://api.openrouteservice.org/v2/isochrones/${mode}`, {
        method: "POST",
        headers: { Authorization: apiKey, "content-type": "application/json", accept: "application/geo+json" },
        body: JSON.stringify({ locations: [[Number(lng.toFixed(3)), Number(lat.toFixed(3))]], range: [minutes * 60] }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const geojson = (await res.json()) as Record<string, unknown>;
        await sql`INSERT INTO isochrone_cache (key, provider, geojson) VALUES (${key}, 'openrouteservice', ${sql.json(geojson as never)}) ON CONFLICT (key) DO NOTHING`;
        return { geojson, provider: "openrouteservice" };
      }
    } catch {
      /* fall through to the approximation */
    }
  }
  return { geojson: fallbackIsochrone(lat, lng, mode, minutes), provider: "approximation" };
}
