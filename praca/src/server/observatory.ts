import { sql } from "@/db";
import { MIN_SAMPLE } from "./indicators";
import type { GeoFeature } from "@/lib/choropleth";

export type Level = "country" | "district" | "municipality" | "parish";

export interface ZoneRef {
  level: Level;
  code: string;
  name: string;
  slug: string;
  /** Breadcrumb ancestors, nearest last. */
  parents: { level: Level; name: string; slug: string; path: string[] }[];
  /** URL slugs from the district down to this zone. */
  path: string[];
}

export async function resolveZone(slugs: string[]): Promise<ZoneRef | null> {
  const [d, m, f] = slugs;
  if (!d) return { level: "country", code: "PT", name: "Portugal", slug: "", parents: [], path: [] };
  const [dist] = await sql<{ code: string; name: string; slug: string }[]>`SELECT code, name, slug FROM geo_districts WHERE slug = ${d}`;
  if (!dist) return null;
  const distParent = { level: "district" as Level, name: dist.name, slug: dist.slug, path: [dist.slug] };
  if (!m) return { level: "district", code: dist.code, name: dist.name, slug: dist.slug, parents: [], path: [dist.slug] };
  const [mun] = await sql<{ code: string; name: string; slug: string }[]>`SELECT code, name, slug FROM geo_municipalities WHERE district_code = ${dist.code} AND slug = ${m}`;
  if (!mun) return null;
  if (!f) return { level: "municipality", code: mun.code, name: mun.name, slug: mun.slug, parents: [distParent], path: [dist.slug, mun.slug] };
  const [par] = await sql<{ code: string; name: string; slug: string }[]>`SELECT code, name, slug FROM geo_parishes WHERE municipality_code = ${mun.code} AND slug = ${f}`;
  if (!par) return null;
  return {
    level: "parish",
    code: par.code,
    name: par.name,
    slug: par.slug,
    parents: [distParent, { level: "municipality", name: mun.name, slug: mun.slug, path: [dist.slug, mun.slug] }],
    path: [dist.slug, mun.slug, par.slug],
  };
}

export interface SeriesPoint {
  period: string;
  ppm: number;
  p25: number | null;
  p75: number | null;
  n: number;
}

export async function getSeries(level: Level, code: string, business: "sale" | "rent", months = 36): Promise<SeriesPoint[]> {
  const rows = await sql<{ period: string; ppm: number; p25: number | null; p75: number | null; n: number }[]>`
    SELECT period::text, median_price_per_m2::float8 AS ppm, p25_price_per_m2::float8 AS p25, p75_price_per_m2::float8 AS p75, n
    FROM market_indicators
    WHERE geo_level = ${level}::geo_level AND geo_code = ${code} AND business = ${business} AND property_type IS NULL AND typology IS NULL
    ORDER BY period DESC LIMIT ${months}`;
  return rows.reverse();
}

export interface Kpi {
  ppm: number;
  p25: number | null;
  p75: number | null;
  medianPrice: number | null;
  n: number;
  yoy: number | null;
  qoq: number | null;
  grossYield: number | null;
  dom: number | null;
  discount: number | null;
  aggregatedFrom: Level | null;
  isSeed: boolean;
  period: string;
  source: string;
}

export async function getKpi(level: Level, code: string, business: "sale" | "rent"): Promise<Kpi | null> {
  const [r] = await sql<{ ppm: number; p25: number | null; p75: number | null; mp: number | null; n: number; yoy: number | null; qoq: number | null; gy: number | null; dom: number | null; disc: number | null; agg: Level | null; is_seed: boolean; period: string; source: string }[]>`
    SELECT median_price_per_m2::float8 AS ppm, p25_price_per_m2::float8 AS p25, p75_price_per_m2::float8 AS p75, median_price::float8 AS mp, n,
           yoy_change::float8 AS yoy, qoq_change::float8 AS qoq, gross_yield::float8 AS gy, median_days_on_market AS dom, avg_asking_discount::float8 AS disc,
           aggregated_from AS agg, is_seed, period::text, source
    FROM market_indicators
    WHERE geo_level = ${level}::geo_level AND geo_code = ${code} AND business = ${business} AND property_type IS NULL AND typology IS NULL AND source = 'computed'
    ORDER BY period DESC LIMIT 1`;
  return r ? { ppm: r.ppm, p25: r.p25, p75: r.p75, medianPrice: r.mp, n: r.n, yoy: r.yoy, qoq: r.qoq, grossYield: r.gy, dom: r.dom, discount: r.disc, aggregatedFrom: r.agg, isSeed: r.is_seed, period: r.period, source: r.source } : null;
}

export interface ChildRow {
  code: string;
  name: string;
  slug: string;
  path: string[];
  ppm: number | null;
  yoy: number | null;
  n: number;
  grossYield: number | null;
  dom: number | null;
  aggregated: boolean;
}

const childLevel: Record<Level, Level | null> = { country: "district", district: "municipality", municipality: "parish", parish: null };

/** Child geographies with their latest sale indicators and a simplified polygon for the heat map. */
export async function getChildren(zone: ZoneRef): Promise<{ rows: ChildRow[]; features: GeoFeature[]; level: Level | null }> {
  const cl = childLevel[zone.level];
  if (!cl) return { rows: [], features: [], level: null };
  const tol = zone.level === "country" ? 0.02 : zone.level === "district" ? 0.004 : 0.0008;
  type R = { code: string; name: string; slug: string; dslug: string | null; mslug: string | null; ppm: number | null; yoy: number | null; n: number | null; gy: number | null; dom: number | null; agg: Level | null; geom: string | null };
  const base =
    cl === "district"
      ? sql`SELECT c.code, c.name, c.slug, NULL::text AS dslug, NULL::text AS mslug, c.geom FROM geo_districts c`
      : cl === "municipality"
        ? sql`SELECT c.code, c.name, c.slug, d.slug AS dslug, NULL::text AS mslug, c.geom FROM geo_municipalities c JOIN geo_districts d ON d.code = c.district_code WHERE c.district_code = ${zone.code}`
        : sql`SELECT c.code, c.name, c.slug, d.slug AS dslug, m.slug AS mslug, c.geom FROM geo_parishes c JOIN geo_municipalities m ON m.code = c.municipality_code JOIN geo_districts d ON d.code = m.district_code WHERE c.municipality_code = ${zone.code}`;
  const rows = await sql<R[]>`
    SELECT b.code, b.name, b.slug, b.dslug, b.mslug,
           i.median_price_per_m2::float8 AS ppm, i.yoy_change::float8 AS yoy, i.n, i.gross_yield::float8 AS gy, i.median_days_on_market AS dom, i.aggregated_from AS agg,
           ST_AsGeoJSON(ST_SimplifyPreserveTopology(b.geom, ${tol}), 4)::text AS geom
    FROM (${base}) b
    LEFT JOIN market_indicators i ON i.geo_level = ${cl}::geo_level AND i.geo_code = b.code AND i.business = 'sale' AND i.property_type IS NULL AND i.typology IS NULL
      AND i.source = 'computed' AND i.period = (SELECT max(period) FROM market_indicators WHERE source = 'computed')
    ORDER BY b.name`;
  const pathFor = (r: R) => (cl === "district" ? [r.slug] : cl === "municipality" ? [zone.slug, r.slug] : [zone.path[0]!, zone.path[1]!, r.slug]);
  const out: ChildRow[] = rows.map((r) => ({
    code: r.code, name: r.name, slug: r.slug,
    path: pathFor(r),
    ppm: r.ppm, yoy: r.yoy, n: r.n ?? 0, grossYield: r.gy, dom: r.dom, aggregated: r.agg !== null,
  }));
  const features: GeoFeature[] = rows.filter((r) => r.geom).map((r) => ({
    key: r.code, name: r.name, href: "/mercado/" + pathFor(r).join("/"),
    value: r.agg ? null : r.ppm, // only own-level (n >= 10) values are coloured; aggregated ones stay neutral
    geometry: JSON.parse(r.geom!),
  }));
  return { rows: out, features, level: cl };
}

export interface HistBucket {
  from: number;
  to: number;
  count: number;
}

const geoColumn = (level: Level) => (level === "district" ? sql`p.district_code` : level === "municipality" ? sql`p.municipality_code` : level === "parish" ? sql`p.parish_code` : sql`'PT'`);

/** Distribution of asking €/m² (active residential sales) in 10 equal-width buckets between the 2nd and 98th percentile. */
export async function getDistribution(level: Level, code: string, business: "sale" | "rent" = "sale"): Promise<{ buckets: HistBucket[]; n: number } | null> {
  const col = geoColumn(level);
  const rows = await sql<{ b: number; c: number; lo: number; hi: number; n: number }[]>`
    WITH base AS (
      SELECT l.price_per_m2::float8 AS v FROM listings l JOIN properties p ON p.id = l.property_id
      WHERE l.status = 'active' AND l.is_primary AND l.deleted_at IS NULL AND p.deleted_at IS NULL AND l.business = ${business}
        AND p.type IN ('apartment','house') AND l.price_per_m2 IS NOT NULL AND ${level === "country" ? sql`true` : sql`${col} = ${code}`}
    ), b AS (SELECT percentile_cont(0.02) WITHIN GROUP (ORDER BY v) AS lo, percentile_cont(0.98) WITHIN GROUP (ORDER BY v) AS hi, count(*)::int AS n FROM base)
    SELECT width_bucket(v, b.lo, b.hi, 10) AS b, count(*)::int AS c, b.lo, b.hi, b.n
    FROM base, b WHERE v >= b.lo AND v <= b.hi GROUP BY 1, b.lo, b.hi, b.n ORDER BY 1`;
  if (!rows.length || rows[0]!.n < MIN_SAMPLE) return null;
  const { lo, hi, n } = rows[0]!;
  const step = (hi - lo) / 10;
  const counts = new Map(rows.map((r) => [Math.min(10, Math.max(1, r.b)), r.c]));
  return { n, buckets: Array.from({ length: 10 }, (_, i) => ({ from: lo + step * i, to: lo + step * (i + 1), count: counts.get(i + 1) ?? 0 })) };
}

export interface TypologyRow {
  typology: number;
  n: number;
  ppm: number;
  medianPrice: number;
  area: number;
}

/** Median asking values by typology for apartments, only for groups with n >= MIN_SAMPLE. */
export async function getTypologyTable(level: Level, code: string): Promise<{ rows: TypologyRow[]; hidden: number }> {
  const col = geoColumn(level);
  const rows = await sql<{ t: number; n: number; ppm: number; mp: number; area: number }[]>`
    SELECT p.typology AS t, count(*)::int AS n, percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price_per_m2)::float8 AS ppm,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY l.price)::float8 AS mp, percentile_cont(0.5) WITHIN GROUP (ORDER BY p.usable_area)::float8 AS area
    FROM listings l JOIN properties p ON p.id = l.property_id
    WHERE l.status = 'active' AND l.is_primary AND l.deleted_at IS NULL AND p.deleted_at IS NULL AND l.business = 'sale' AND p.type = 'apartment'
      AND l.price_per_m2 IS NOT NULL AND p.typology IS NOT NULL AND ${level === "country" ? sql`true` : sql`${col} = ${code}`}
    GROUP BY p.typology ORDER BY p.typology`;
  const shown = rows.filter((r) => r.n >= MIN_SAMPLE);
  return { rows: shown.map((r) => ({ typology: r.t, n: r.n, ppm: r.ppm, medianPrice: r.mp, area: r.area })), hidden: rows.length - shown.length };
}

export async function hasTransactions(level: Level, code: string): Promise<boolean> {
  const [r] = await sql<{ x: boolean }[]>`SELECT EXISTS (SELECT 1 FROM transactions WHERE geo_level = ${level}::geo_level AND geo_code = ${code}) AS x`;
  return r?.x ?? false;
}

export async function getTransactionSeries(level: Level, code: string): Promise<{ period: string; ppm: number; n: number; source: string }[]> {
  return sql<{ period: string; ppm: number; n: number; source: string }[]>`
    SELECT period::text, median_price_per_m2::float8 AS ppm, n, source FROM transactions
    WHERE geo_level = ${level}::geo_level AND geo_code = ${code} AND property_type IS NULL AND typology IS NULL ORDER BY period`;
}

/** Position of the zone among its siblings by asking €/m² (1 = most expensive) and how many siblings have an own-level value. */
export async function getRank(zone: ZoneRef): Promise<{ rank: number; total: number } | null> {
  if (zone.level === "country") return null;
  const siblings =
    zone.level === "district"
      ? sql`SELECT code FROM geo_districts`
      : zone.level === "municipality"
        ? sql`SELECT code FROM geo_municipalities WHERE district_code = (SELECT district_code FROM geo_municipalities WHERE code = ${zone.code})`
        : sql`SELECT code FROM geo_parishes WHERE municipality_code = (SELECT municipality_code FROM geo_parishes WHERE code = ${zone.code})`;
  const [r] = await sql<{ rank: number; total: number }[]>`
    WITH cur AS (SELECT period FROM market_indicators WHERE source = 'computed' ORDER BY period DESC LIMIT 1),
    sib AS (
      SELECT i.geo_code, i.median_price_per_m2 AS v FROM market_indicators i, cur
      WHERE i.geo_level = ${zone.level}::geo_level AND i.business = 'sale' AND i.property_type IS NULL AND i.typology IS NULL AND i.source = 'computed'
        AND i.period = cur.period AND i.aggregated_from IS NULL AND i.geo_code IN (SELECT code FROM (${siblings}) x))
    SELECT (SELECT count(*) FROM sib WHERE v > (SELECT v FROM sib WHERE geo_code = ${zone.code}))::int + 1 AS rank, (SELECT count(*) FROM sib)::int AS total
    WHERE EXISTS (SELECT 1 FROM sib WHERE geo_code = ${zone.code})`;
  return r ?? null;
}

export interface CodeZone {
  level: Level;
  code: string;
  name: string;
  path: string[];
}

/** Resolves district (2 digits), municipality (4) and parish (6) codes into zones. Unknown codes are skipped. */
export async function resolveCodes(codes: string[]): Promise<CodeZone[]> {
  const out: CodeZone[] = [];
  for (const c of [...new Set(codes)].slice(0, 4)) {
    if (c === "PT") out.push({ level: "country", code: "PT", name: "Portugal", path: [] });
    else if (/^\d{2}$/.test(c)) {
      const [r] = await sql<{ name: string; slug: string }[]>`SELECT name, slug FROM geo_districts WHERE code = ${c}`;
      if (r) out.push({ level: "district", code: c, name: r.name, path: [r.slug] });
    } else if (/^\d{4}$/.test(c)) {
      const [r] = await sql<{ name: string; slug: string; dslug: string }[]>`SELECT m.name, m.slug, d.slug AS dslug FROM geo_municipalities m JOIN geo_districts d ON d.code = m.district_code WHERE m.code = ${c}`;
      if (r) out.push({ level: "municipality", code: c, name: r.name, path: [r.dslug, r.slug] });
    } else if (/^\d{6}$/.test(c)) {
      const [r] = await sql<{ name: string; slug: string; mslug: string; dslug: string }[]>`SELECT p.name, p.slug, m.slug AS mslug, d.slug AS dslug FROM geo_parishes p JOIN geo_municipalities m ON m.code = p.municipality_code JOIN geo_districts d ON d.code = m.district_code WHERE p.code = ${c}`;
      if (r) out.push({ level: "parish", code: c, name: r.name, path: [r.dslug, r.mslug, r.slug] });
    }
  }
  return out;
}
