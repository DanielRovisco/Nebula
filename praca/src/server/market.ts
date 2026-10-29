import { sql } from "@/db";

export interface HeadlineStat {
  code: string;
  label: string;
  pricePerM2: number;
  yoy: number | null;
  n: number;
  series: { period: string; v: number }[];
  isSeed: boolean;
}

/** Headline sale €/m² for Portugal and the biggest markets, with a 24-month sparkline. */
export async function headlineStats(): Promise<HeadlineStat[]> {
  const targets: [string, string, string][] = [
    ["country", "PT", "Portugal"],
    ["municipality", "1106", "Lisboa"],
    ["municipality", "1312", "Porto"],
    ["municipality", "0805", "Faro"],
  ];
  const out: HeadlineStat[] = [];
  for (const [level, code, label] of targets) {
    const rows = await sql<{ period: string; v: number; yoy: number | null; n: number; is_seed: boolean; src: string }[]>`
      SELECT period::text, median_price_per_m2::float8 AS v, yoy_change::float8 AS yoy, n, is_seed, source AS src
      FROM market_indicators
      WHERE geo_level = ${level}::geo_level AND geo_code = ${code} AND business = 'sale' AND property_type IS NULL AND typology IS NULL
      ORDER BY period DESC LIMIT 24`;
    const cur = rows.find((r) => r.src === "computed");
    if (!cur) continue;
    out.push({
      code,
      label,
      pricePerM2: cur.v,
      yoy: cur.yoy,
      n: cur.n,
      series: rows.map((r) => ({ period: r.period, v: r.v })).reverse(),
      isSeed: cur.is_seed,
    });
  }
  return out;
}

export interface Coverage {
  listings: number;
  properties: number;
  municipalities: number;
  duplicatesMerged: number;
  hasSeed: boolean;
}

/** Honest "social proof": counts of what the portal actually holds. */
export async function coverage(): Promise<Coverage> {
  const [r] = await sql<{ listings: number; properties: number; municipalities: number; dups: number; seed: boolean }[]>`
    SELECT count(*) FILTER (WHERE l.status = 'active')::int AS listings,
           count(DISTINCT p.id) FILTER (WHERE l.status = 'active')::int AS properties,
           count(DISTINCT p.municipality_code) FILTER (WHERE l.status = 'active')::int AS municipalities,
           count(*) FILTER (WHERE l.status = 'active' AND NOT l.is_primary)::int AS dups,
           coalesce(bool_or(l.is_seed), false) AS seed
    FROM listings l JOIN properties p ON p.id = l.property_id WHERE l.deleted_at IS NULL`;
  return {
    listings: r?.listings ?? 0,
    properties: r?.properties ?? 0,
    municipalities: r?.municipalities ?? 0,
    duplicatesMerged: r?.dups ?? 0,
    hasSeed: r?.seed ?? false,
  };
}

export async function hasSeedData(): Promise<boolean> {
  const [r] = await sql<{ seed: boolean }[]>`SELECT EXISTS (SELECT 1 FROM listings WHERE is_seed AND deleted_at IS NULL) AS seed`;
  return r?.seed ?? false;
}

export interface FeaturedItem {
  id: string;
  reference: string;
  title: string;
  price: number;
  business: "sale" | "rent";
  area: number | null;
  typology: number | null;
  bedrooms: number | null;
  parish: string | null;
  municipality: string | null;
  image: string | null;
  verified: boolean;
}

export async function featuredListings(business: "sale" | "rent", limit = 6): Promise<FeaturedItem[]> {
  const rows = await sql<
    { id: string; reference: string; title: string; price: number; business: "sale" | "rent"; area: number | null; typology: number | null; bedrooms: number | null; parish: string | null; municipality: string | null; image: string | null; verified: boolean }[]
  >`
    SELECT l.id, p.reference, l.title, l.price::float8 AS price, l.business, p.usable_area::float8 AS area, p.typology, p.bedrooms,
           pa.name AS parish, mu.name AS municipality, l.verified,
           (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image
    FROM listings l JOIN properties p ON p.id = l.property_id
    LEFT JOIN geo_parishes pa ON pa.code = p.parish_code LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
    WHERE l.status = 'active' AND l.is_primary AND l.deleted_at IS NULL AND l.business = ${business} AND p.type = 'apartment'
    ORDER BY l.featured DESC, l.verified DESC, l.published_at DESC LIMIT ${limit}`;
  return rows;
}

export interface ArticleCard {
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  publishedAt: string;
}

export async function latestArticles(limit = 3): Promise<ArticleCard[]> {
  const rows = await sql<{ slug: string; title: string; excerpt: string | null; tags: string[]; published_at: Date }[]>`
    SELECT slug, title, excerpt, tags, published_at FROM articles
    WHERE deleted_at IS NULL AND published_at IS NOT NULL AND published_at <= now() AND locale = 'pt'
    ORDER BY published_at DESC LIMIT ${limit}`;
  return rows.map((r) => ({ slug: r.slug, title: r.title, excerpt: r.excerpt, tags: r.tags, publishedAt: r.published_at.toISOString() }));
}
