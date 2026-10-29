import type postgres from "postgres";

/** Minimum sample to publish an indicator at its own geographic level. */
export const MIN_SAMPLE = 10;

type Level = "country" | "district" | "municipality" | "parish";
const PARENT: Record<Level, Level | null> = { parish: "municipality", municipality: "district", district: "country", country: null };

interface Row {
  level: Level;
  code: string;
  business: "sale" | "rent";
  n: number;
  median: number;
  p25: number;
  p75: number;
  medianPrice: number;
  dom: number;
  discount: number;
}

export const monthStart = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);

/**
 * Recomputes the current-month snapshot of market indicators from live listings
 * (active, primary, residential). Robust statistics: the 2 % tails of €/m² are winsorised away
 * before the median; groups with n < MIN_SAMPLE borrow the parent level and say so (aggregated_from).
 * Idempotent per month: rerunning replaces the month's computed rows.
 */
export async function computeIndicators(sql: postgres.Sql, now = new Date()) {
  const period = monthStart(now);

  const rows = await sql<
    { level: Level; code: string; business: "sale" | "rent"; n: string; median: number; p25: number; p75: number; median_price: number; dom: number; discount: number }[]
  >`
    WITH base AS (
      SELECT p.district_code, p.municipality_code, p.parish_code, l.business, l.price::float8 AS price,
             l.price_per_m2::float8 AS ppm, l.price_drop_pct::float8 AS drop_pct,
             GREATEST(EXTRACT(day FROM now() - l.published_at), 0)::float8 AS dom
      FROM listings l JOIN properties p ON p.id = l.property_id
      WHERE l.status = 'active' AND l.is_primary AND l.deleted_at IS NULL AND p.deleted_at IS NULL
        AND p.type IN ('apartment', 'house') AND l.price_per_m2 IS NOT NULL
    ), exploded AS (
      SELECT 'country' AS lvl, 'PT' AS code, * FROM base
      UNION ALL SELECT 'district', district_code, * FROM base WHERE district_code IS NOT NULL
      UNION ALL SELECT 'municipality', municipality_code, * FROM base WHERE municipality_code IS NOT NULL
      UNION ALL SELECT 'parish', parish_code, * FROM base WHERE parish_code IS NOT NULL
    ), bounds AS (
      SELECT lvl, code, business,
             count(*) AS n_raw,
             percentile_cont(0.02) WITHIN GROUP (ORDER BY ppm) AS lo,
             percentile_cont(0.98) WITHIN GROUP (ORDER BY ppm) AS hi
      FROM exploded GROUP BY lvl, code, business
    )
    SELECT e.lvl AS level, e.code, e.business, b.n_raw AS n,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY e.ppm) AS median,
           percentile_cont(0.25) WITHIN GROUP (ORDER BY e.ppm) AS p25,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY e.ppm) AS p75,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY e.price) AS median_price,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY e.dom) AS dom,
           avg(e.drop_pct) / 100.0 AS discount
    FROM exploded e JOIN bounds b ON b.lvl = e.lvl AND b.code = e.code AND b.business = e.business
    WHERE e.ppm BETWEEN b.lo AND b.hi
    GROUP BY e.lvl, e.code, e.business, b.n_raw`;

  const key = (l: string, c: string, b: string) => `${l}:${c}:${b}`;
  const byKey = new Map<string, Row>();
  for (const r of rows) {
    byKey.set(key(r.level, r.code, r.business), {
      level: r.level,
      code: r.code,
      business: r.business,
      n: Number(r.n),
      median: r.median,
      p25: r.p25,
      p75: r.p75,
      medianPrice: r.median_price,
      dom: r.dom,
      discount: r.discount,
    });
  }

  const parentCode = new Map<string, string>();
  const geo = await sql<{ level: string; code: string; parent: string }[]>`
    SELECT 'parish' AS level, code, municipality_code AS parent FROM geo_parishes
    UNION ALL SELECT 'municipality', code, district_code FROM geo_municipalities
    UNION ALL SELECT 'district', code, 'PT' FROM geo_districts`;
  for (const g of geo) parentCode.set(`${g.level}:${g.code}`, g.parent);

  // Resolve each row to the first ancestor (or itself) with n >= MIN_SAMPLE.
  const resolve = (r: Row): { src: Row; aggregatedFrom: Level | null } | null => {
    let cur: Row | undefined = r;
    let level: Level = r.level;
    let code = r.code;
    while (cur && cur.n < MIN_SAMPLE) {
      const p = PARENT[level];
      if (!p) return cur.n > 0 ? { src: cur, aggregatedFrom: null } : null;
      code = parentCode.get(`${level}:${code}`) ?? "PT";
      level = p;
      cur = byKey.get(key(level, code, r.business));
    }
    if (!cur) return null;
    return { src: cur, aggregatedFrom: level === r.level ? null : level };
  };

  // Gross yield = annual rent per m² / sale price per m², at the resolved level.
  const yieldFor = (r: Row) => {
    const res = resolve(r);
    if (!res) return null;
    const sale = byKey.get(key(res.src.level, res.src.code, "sale"));
    const rent = byKey.get(key(res.src.level, res.src.code, "rent"));
    if (!sale || !rent || sale.n < MIN_SAMPLE || rent.n < MIN_SAMPLE) return null;
    return (rent.median * 12) / sale.median;
  };

  const past = await sql<{ geo_level: string; geo_code: string; business: string; period: string; v: number }[]>`
    SELECT geo_level, geo_code, business, period::text, median_price_per_m2::float8 AS v
    FROM market_indicators
    WHERE property_type IS NULL AND typology IS NULL AND period IN (
      (${period}::date - interval '12 months')::date, (${period}::date - interval '3 months')::date)`;
  const pastMap = new Map(past.map((p) => [`${p.geo_level}:${p.geo_code}:${p.business}:${p.period}`, p.v]));
  const shift = (months: number) => {
    const d = new Date(period + "T00:00:00Z");
    d.setUTCMonth(d.getUTCMonth() - months);
    return d.toISOString().slice(0, 10);
  };

  // Indicators computed purely from demo listings must be flagged so the UI can say so.
  const [{ all_seed: allSeed } = { all_seed: false }] = await sql<{ all_seed: boolean }[]>`
    SELECT coalesce(bool_and(is_seed), false) AS all_seed FROM listings WHERE status = 'active' AND deleted_at IS NULL`;

  const out = [];
  for (const r of byKey.values()) {
    const res = resolve(r);
    if (!res) continue;
    const s = res.src;
    const prevYear = pastMap.get(`${r.level}:${r.code}:${r.business}:${shift(12)}`);
    const prevQ = pastMap.get(`${r.level}:${r.code}:${r.business}:${shift(3)}`);
    out.push({
      geo_level: r.level,
      geo_code: r.code,
      business: r.business,
      period,
      median_price_per_m2: Math.round(s.median * 100) / 100,
      p25_price_per_m2: Math.round(s.p25 * 100) / 100,
      p75_price_per_m2: Math.round(s.p75 * 100) / 100,
      median_price: Math.round(s.medianPrice),
      n: r.n,
      yoy_change: prevYear ? Math.round((s.median / prevYear - 1) * 1e4) / 1e4 : null,
      qoq_change: prevQ ? Math.round((s.median / prevQ - 1) * 1e4) / 1e4 : null,
      gross_yield: (() => {
        const y = yieldFor(r);
        return y ? Math.round(y * 1e4) / 1e4 : null;
      })(),
      median_days_on_market: Math.round(s.dom),
      avg_asking_discount: Math.round(s.discount * 1e4) / 1e4,
      aggregated_from: res.aggregatedFrom,
      source: "computed",
      is_seed: allSeed,
    });
  }

  await sql`DELETE FROM market_indicators WHERE period = ${period}::date AND source = 'computed'`;
  for (let i = 0; i < out.length; i += 1000) {
    await sql`INSERT INTO market_indicators ${sql(out.slice(i, i + 1000))}`;
  }
  return { period, rows: out.length };
}
