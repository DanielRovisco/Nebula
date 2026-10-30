import { sql } from "@/db";
import type { NormalizedListing } from "./types";

export interface Located {
  lat: number;
  lng: number;
  precision: "exact" | "street" | "parish";
  districtCode: string | null;
  municipalityCode: string | null;
  parishCode: string | null;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

let nominatimChain: Promise<unknown> = Promise.resolve();
/** Nominatim usage policy: one request per second, identifying User-Agent, results cached. */
function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  const run = async () => {
    await new Promise((r) => setTimeout(r, 1100));
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=pt&limit=1&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "user-agent": process.env.GEOCODER_USER_AGENT ?? "Praca/1.0" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const d = (await res.json()) as { lat: string; lon: string }[];
    return d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
  };
  const p = nominatimChain.then(run, run) as Promise<{ lat: number; lng: number } | null>;
  nominatimChain = p.catch(() => null);
  return p;
}

async function codesAt(lat: number, lng: number) {
  const [r] = await sql<{ parish: string; municipality: string; district: string }[]>`
    SELECT pa.code AS parish, m.code AS municipality, m.district_code AS district
    FROM geo_parishes pa JOIN geo_municipalities m ON m.code = pa.municipality_code
    WHERE ST_Contains(pa.geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)) LIMIT 1`;
  if (r) return r;
  // Points on the coast or on simplified borders: take the nearest parish within 3 km.
  const [n] = await sql<{ parish: string; municipality: string; district: string }[]>`
    SELECT pa.code AS parish, m.code AS municipality, m.district_code AS district
    FROM geo_parishes pa JOIN geo_municipalities m ON m.code = pa.municipality_code
    WHERE ST_DWithin(pa.geom::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 3000)
    ORDER BY pa.geom <-> ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) LIMIT 1`;
  return n ?? null;
}

async function municipalityByName(name: string): Promise<{ code: string; lat: number; lng: number } | null> {
  const n = norm(name);
  const [r] = await sql<{ code: string; lat: number; lng: number }[]>`
    SELECT code, lat, lng FROM geo_municipalities WHERE name_search = ${n} OR similarity(name_search, ${n}) > 0.6 ORDER BY similarity(name_search, ${n}) DESC LIMIT 1`;
  return r ?? null;
}

/**
 * Resolves a normalised advert to coordinates and administrative codes. Order of trust:
 * coordinates given by the source → postcode centroid → geocoder (cached, optional) → parish/municipality name centroid.
 */
export async function locate(n: NormalizedListing): Promise<Located | null> {
  let lat = n.lat ?? null;
  let lng = n.lng ?? null;
  let precision: Located["precision"] = "exact";

  if (lat == null || lng == null) {
    lat = lng = null;
    if (n.postalCode) {
      const [pc] = await sql<{ lat: number | null; lng: number | null }[]>`SELECT lat, lng FROM geo_postcodes WHERE code = ${n.postalCode}`;
      if (pc?.lat != null && pc.lng != null) [lat, lng, precision] = [pc.lat, pc.lng, "street"];
    }
  }

  if ((lat == null || lng == null) && process.env.GEOCODER === "nominatim" && (n.address || n.postalCode)) {
    const q = [n.address, n.postalCode, n.parishName, n.municipalityName].filter(Boolean).join(", ");
    const key = norm(q);
    const [cached] = await sql<{ lat: number | null; lng: number | null }[]>`SELECT lat, lng FROM geocode_cache WHERE key = ${key}`;
    if (cached) {
      if (cached.lat != null && cached.lng != null) [lat, lng, precision] = [cached.lat, cached.lng, "street"];
    } else {
      const g = await nominatim(q).catch(() => null);
      await sql`INSERT INTO geocode_cache (key, lat, lng, precision, provider) VALUES (${key}, ${g?.lat ?? null}, ${g?.lng ?? null}, ${g ? "street" : null}, 'nominatim') ON CONFLICT (key) DO NOTHING`;
      if (g) [lat, lng, precision] = [g.lat, g.lng, "street"];
    }
  }

  if (lat == null || lng == null) {
    const mun = n.municipalityName ? await municipalityByName(n.municipalityName) : null;
    if (!mun) return null;
    let [plat, plng] = [mun.lat, mun.lng];
    if (n.parishName) {
      const pn = norm(n.parishName);
      const [pa] = await sql<{ lat: number; lng: number }[]>`SELECT lat, lng FROM geo_parishes WHERE municipality_code = ${mun.code} AND (name_search = ${pn} OR similarity(name_search, ${pn}) > 0.45) ORDER BY similarity(name_search, ${pn}) DESC LIMIT 1`;
      if (pa) [plat, plng] = [pa.lat, pa.lng];
    }
    [lat, lng, precision] = [plat, plng, "parish"];
  }

  const codes = await codesAt(lat, lng);
  return { lat, lng, precision, districtCode: codes?.district ?? null, municipalityCode: codes?.municipality ?? null, parishCode: codes?.parish ?? null };
}
