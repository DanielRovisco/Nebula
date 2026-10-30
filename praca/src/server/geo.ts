import { sql } from "@/db";
import { slugify } from "@/lib/slug";

export interface GeoRef {
  code: string;
  name: string;
  slug: string;
}

export interface ResolvedGeo {
  district?: GeoRef;
  municipality?: GeoRef;
  parish?: GeoRef;
  /** [west, south, east, north] */
  bounds?: [number, number, number, number];
  center?: [number, number];
}

/** Resolves /distrito/concelho/freguesia slugs into codes and map bounds. Returns null if any slug is unknown. */
export async function resolveGeoPath(slugs: string[]): Promise<ResolvedGeo | null> {
  const [d, m, f] = slugs;
  const out: ResolvedGeo = {};
  if (!d) return out;

  const [district] = await sql<GeoRef[]>`SELECT code, name, slug FROM geo_districts WHERE slug = ${d}`;
  if (!district) return null;
  out.district = district;
  let table = sql`geo_districts WHERE code = ${district.code}`;

  if (m) {
    const [mun] = await sql<GeoRef[]>`SELECT code, name, slug FROM geo_municipalities WHERE district_code = ${district.code} AND slug = ${m}`;
    if (!mun) return null;
    out.municipality = mun;
    table = sql`geo_municipalities WHERE code = ${mun.code}`;
    if (f) {
      const [par] = await sql<GeoRef[]>`SELECT code, name, slug FROM geo_parishes WHERE municipality_code = ${mun.code} AND slug = ${f}`;
      if (!par) return null;
      out.parish = par;
      table = sql`geo_parishes WHERE code = ${par.code}`;
    }
  }
  const [b] = await sql<{ w: number; s: number; e: number; n: number }[]>`
    SELECT ST_XMin(ext) AS w, ST_YMin(ext) AS s, ST_XMax(ext) AS e, ST_YMax(ext) AS n
    FROM (SELECT ST_Extent(geom) AS ext FROM ${table}) q`;
  if (b && b.w != null) out.bounds = [b.w, b.s, b.e, b.n];
  return out;
}

export type SuggestKind = "district" | "municipality" | "parish" | "postcode" | "reference" | "address";

export interface Suggestion {
  kind: SuggestKind;
  /** DTMN code for geo kinds, used by the analytics zone picker. */
  code?: string;
  /** Centroid, for centring maps on the chosen place. */
  lat?: number;
  lng?: number;
  label: string;
  sublabel?: string;
  /** Path slugs [district, municipality, parish] for geo kinds; full href for others. */
  path?: string[];
  href?: string;
}

const norm = (s: string) => slugify(s).replace(/-/g, " ");

/** Autocomplete across districts, municipalities, parishes, postcodes, property references and addresses. */
export async function suggest(raw: string, limit = 8): Promise<Suggestion[]> {
  const q = raw.trim().slice(0, 80);
  if (q.length < 2) return [];
  const nq = norm(q);
  const like = nq.replace(/[%_\\]/g, "\\$&") + "%";
  const out: Suggestion[] = [];

  if (/^pr-?\d{1,6}$/i.test(q)) {
    const ref = "PR-" + q.replace(/\D/g, "").padStart(6, "0");
    const rows = await sql<{ reference: string; title: string; mun: string | null }[]>`
      SELECT p.reference, l.title, m.name AS mun FROM properties p
      JOIN listings l ON l.property_id = p.id AND l.is_primary
      LEFT JOIN geo_municipalities m ON m.code = p.municipality_code
      WHERE p.reference = ${ref} AND p.deleted_at IS NULL LIMIT 1`;
    for (const r of rows) out.push({ kind: "reference", label: r.reference, sublabel: `${r.title}`, href: `/imovel/${r.reference.toLowerCase()}` });
  }

  if (/^\d{4}(-\d{0,3})?$/.test(q)) {
    const rows = await sql<{ code: string; lat: number | null; lng: number | null; parish: string | null; mun: string | null; dslug: string | null; mslug: string | null; pslug: string | null }[]>`
      SELECT pc.code, pc.lat, pc.lng, pa.name AS parish, m.name AS mun, d.slug AS dslug, m.slug AS mslug, pa.slug AS pslug
      FROM geo_postcodes pc
      LEFT JOIN geo_parishes pa ON pa.code = pc.parish_code
      LEFT JOIN geo_municipalities m ON m.code = pa.municipality_code
      LEFT JOIN geo_districts d ON d.code = m.district_code
      WHERE pc.code LIKE ${q + "%"} ORDER BY pc.code LIMIT 4`;
    for (const r of rows)
      out.push({
        kind: "postcode",
        lat: r.lat ?? undefined,
        lng: r.lng ?? undefined,
        label: r.code,
        sublabel: [r.parish, r.mun].filter(Boolean).join(", "),
        path: [r.dslug, r.mslug, r.pslug].filter((x): x is string => !!x),
      });
  }

  const munis = await sql<{ lat: number; lng: number; code: string; name: string; slug: string; dname: string; dslug: string; sim: number }[]>`
    SELECT m.lat, m.lng, m.code, m.name, m.slug, d.name AS dname, d.slug AS dslug,
           GREATEST(similarity(m.name_search, ${nq}), CASE WHEN m.name_search LIKE ${like} THEN 1 ELSE 0 END) AS sim
    FROM geo_municipalities m JOIN geo_districts d ON d.code = m.district_code
    WHERE m.name_search LIKE ${like} OR m.name_search % ${nq}
    ORDER BY sim DESC, m.name LIMIT 5`;
  for (const m of munis) out.push({ kind: "municipality", code: m.code, lat: m.lat, lng: m.lng, label: m.name, sublabel: `Concelho · ${m.dname}`, path: [m.dslug, m.slug] });

  const dists = await sql<{ lat: number; lng: number; code: string; name: string; slug: string }[]>`
    SELECT lat, lng, code, name, slug FROM geo_districts WHERE lower(immutable_unaccent(name)) LIKE ${like} ORDER BY name LIMIT 2`;
  for (const d of dists) out.push({ kind: "district", code: d.code, lat: d.lat, lng: d.lng, label: d.name, sublabel: "Distrito", path: [d.slug] });

  if (nq.length >= 3) {
    const parishes = await sql<{ lat: number; lng: number; code: string; name: string; slug: string; mname: string; mslug: string; dslug: string; sim: number }[]>`
      SELECT pa.lat, pa.lng, pa.code, pa.name, pa.slug, m.name AS mname, m.slug AS mslug, d.slug AS dslug,
             GREATEST(similarity(pa.name_search, ${nq}), CASE WHEN pa.name_search LIKE ${like} THEN 1 ELSE 0 END) AS sim
      FROM geo_parishes pa JOIN geo_municipalities m ON m.code = pa.municipality_code JOIN geo_districts d ON d.code = m.district_code
      WHERE pa.name_search LIKE ${like} OR pa.name_search % ${nq}
      ORDER BY sim DESC, pa.name LIMIT 6`;
    for (const p of parishes) out.push({ kind: "parish", code: p.code, lat: p.lat, lng: p.lng, label: p.name, sublabel: `Freguesia · ${p.mname}`, path: [p.dslug, p.mslug, p.slug] });
  }

  // Municipalities and districts first, then parishes: the usual intent for a short query.
  const rank: Record<SuggestKind, number> = { reference: 0, postcode: 1, municipality: 2, district: 3, parish: 4, address: 5 };
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]).slice(0, limit);
}

export interface FeaturedZone {
  name: string;
  districtSlug: string;
  slug: string;
  pricePerM2: number;
  yoy: number | null;
  n: number;
}

/** Hot zones: municipalities with the strongest year-on-year change (n >= 30, own-level data only). */
export async function hotZones(limit = 6): Promise<FeaturedZone[]> {
  const rows = await sql<{ name: string; slug: string; dslug: string; ppm: number; yoy: number | null; n: number }[]>`
    SELECT m.name, m.slug, d.slug AS dslug, i.median_price_per_m2::float8 AS ppm, i.yoy_change::float8 AS yoy, i.n
    FROM market_indicators i
    JOIN geo_municipalities m ON m.code = i.geo_code
    JOIN geo_districts d ON d.code = m.district_code
    WHERE i.geo_level = 'municipality' AND i.business = 'sale' AND i.property_type IS NULL AND i.typology IS NULL
      AND i.aggregated_from IS NULL AND i.n >= 30 AND i.yoy_change IS NOT NULL
      AND i.period = (SELECT max(period) FROM market_indicators WHERE source = 'computed')
    ORDER BY i.yoy_change DESC LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.name, slug: r.slug, districtSlug: r.dslug, pricePerM2: r.ppm, yoy: r.yoy, n: r.n }));
}
