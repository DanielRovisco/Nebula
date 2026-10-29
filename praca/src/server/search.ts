import type postgres from "postgres";
import { sql } from "@/db";
import { parseFilters, PUBLISHED_DAYS, type SearchFilters } from "@/lib/filters";

type Frag = postgres.PendingQuery<postgres.Row[]>;

export interface ResultItem {
  id: string; // listing id
  propertyId: string;
  reference: string;
  business: "sale" | "rent";
  price: number;
  pricePerM2: number | null;
  dropPct: number;
  type: string;
  typology: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lat: number;
  lng: number;
  title: string;
  advertiserType: "private" | "professional";
  advertiserName: string | null;
  verified: boolean;
  publishedAt: string;
  featured: boolean;
  energy: string | null;
  parish: string | null;
  municipality: string | null;
  image: string | null;
  listingCount: number;
  isSeed: boolean;
}

export interface SearchResult {
  items: ResultItem[];
  total: number;
  nextCursor: string | null;
}

export interface MapPoint {
  id: string;
  x: number;
  y: number;
  p: number;
}

export const PAGE_SIZE = 24;
export const MAP_POINT_LIMIT = 6000;

const and = (parts: Frag[]): Frag => parts.reduce((a, b) => sql`${a} AND ${b}`);

/** Builds the WHERE conditions shared by list, count and map queries. All values are bound parameters. */
export function buildConditions(f: SearchFilters): Frag[] {
  const c: Frag[] = [
    sql`l.status = 'active'`,
    sql`l.is_primary`,
    sql`l.deleted_at IS NULL`,
    sql`p.deleted_at IS NULL`,
    ...(f.id ? [sql`l.id = ${f.id}::uuid`] : [sql`l.business = ${f.business}`]),
  ];
  if (f.types.length) c.push(sql`p.type = ANY(${sql.array(f.types)}::property_type[])`);
  if (f.typologies.length) c.push(sql`p.typology = ANY(${sql.array(f.typologies)}::smallint[])`);
  if (f.priceMin != null) c.push(sql`l.price >= ${f.priceMin}`);
  if (f.priceMax != null) c.push(sql`l.price <= ${f.priceMax}`);
  if (f.areaMin != null) c.push(sql`p.usable_area >= ${f.areaMin}`);
  if (f.areaMax != null) c.push(sql`p.usable_area <= ${f.areaMax}`);
  if (f.grossMin != null) c.push(sql`p.gross_area >= ${f.grossMin}`);
  if (f.grossMax != null) c.push(sql`p.gross_area <= ${f.grossMax}`);
  if (f.plotMin != null) c.push(sql`p.plot_area >= ${f.plotMin}`);
  if (f.plotMax != null) c.push(sql`p.plot_area <= ${f.plotMax}`);
  if (f.bedrooms != null) c.push(sql`p.bedrooms >= ${f.bedrooms}`);
  if (f.bathrooms != null) c.push(sql`p.bathrooms >= ${f.bathrooms}`);
  if (f.parking != null) c.push(sql`p.parking_spaces >= ${f.parking}`);
  if (f.elevator) c.push(sql`p.elevator`);
  if (f.balcony) c.push(sql`(p.balcony OR p.terrace)`);
  if (f.pool) c.push(sql`p.pool`);
  if (f.garden) c.push(sql`p.garden`);
  if (f.furnished) c.push(sql`p.furnished`);
  if (f.pets) c.push(sql`p.pets_allowed`);
  if (f.priceDrop) c.push(sql`l.price_drop_pct > 0`);
  if (f.occupancy === "free") c.push(sql`NOT p.tenanted`);
  if (f.occupancy === "tenanted") c.push(sql`p.tenanted`);
  if (f.conditions.length) c.push(sql`p.condition = ANY(${sql.array(f.conditions)}::property_condition[])`);
  if (f.energy.length) c.push(sql`p.energy_class = ANY(${sql.array(f.energy)}::energy_class[])`);
  if (f.yearMin != null) c.push(sql`p.year_built >= ${f.yearMin}`);
  if (f.yearMax != null) c.push(sql`p.year_built <= ${f.yearMax}`);
  if (f.floorMin != null) c.push(sql`p.floor >= ${f.floorMin}`);
  if (f.floorMax != null) c.push(sql`p.floor <= ${f.floorMax}`);
  if (f.views.length) c.push(sql`p.view = ANY(${sql.array(f.views)})`);
  if (f.published) c.push(sql`l.published_at >= now() - make_interval(days => ${PUBLISHED_DAYS[f.published]})`);
  if (f.advertiser) c.push(sql`l.advertiser_type = ${f.advertiser}`);
  if (f.agency) c.push(sql`l.agency_id = ${f.agency}`);
  if (f.districtCode) c.push(sql`p.district_code = ${f.districtCode}`);
  if (f.municipalityCode) c.push(sql`p.municipality_code = ${f.municipalityCode}`);
  if (f.parishCode) c.push(sql`p.parish_code = ${f.parishCode}`);
  if (f.bbox) {
    // && uses the GiST expression index properties_geom_gist.
    c.push(sql`ST_SetSRID(ST_MakePoint(p.lng, p.lat), 4326) && ST_MakeEnvelope(${f.bbox.w}, ${f.bbox.s}, ${f.bbox.e}, ${f.bbox.n}, 4326)`);
  }
  if (f.q) {
    c.push(
      sql`(l.search @@ websearch_to_tsquery('portuguese', ${f.q}) OR p.reference = upper(${f.q}) OR p.address ILIKE ${"%" + f.q.replace(/[%_\\]/g, "\\$&") + "%"})`,
    );
  }
  return c;
}

interface SortSpec {
  expr: Frag;
  cast: "timestamptz" | "numeric";
  dir: "asc" | "desc";
}

function sortSpec(f: SearchFilters): SortSpec {
  switch (f.sort) {
    case "price_asc":
      return { expr: sql`l.price`, cast: "numeric", dir: "asc" };
    case "price_desc":
      return { expr: sql`l.price`, cast: "numeric", dir: "desc" };
    case "ppm_asc":
      return { expr: sql`coalesce(l.price_per_m2, 1000000000)`, cast: "numeric", dir: "asc" };
    case "drop_desc":
      return { expr: sql`l.price_drop_pct`, cast: "numeric", dir: "desc" };
    case "dom_desc":
      return { expr: sql`l.published_at`, cast: "timestamptz", dir: "asc" };
    case "relevance":
      if (f.q) return { expr: sql`ts_rank(l.search, websearch_to_tsquery('portuguese', ${f.q}))::numeric(10,6)`, cast: "numeric", dir: "desc" };
      return { expr: sql`l.published_at`, cast: "timestamptz", dir: "desc" };
    default:
      return { expr: sql`l.published_at`, cast: "timestamptz", dir: "desc" };
  }
}

const encodeCursor = (key: string, id: string) => Buffer.from(JSON.stringify([key, id])).toString("base64url");
function decodeCursor(c: string | undefined): [string, string] | null {
  if (!c) return null;
  try {
    const v = JSON.parse(Buffer.from(c, "base64url").toString("utf8"));
    if (Array.isArray(v) && typeof v[0] === "string" && typeof v[1] === "string" && /^[0-9a-f-]{36}$/i.test(v[1])) return [v[0], v[1]];
  } catch {
    /* fall through */
  }
  return null;
}

interface Row {
  id: string;
  property_id: string;
  reference: string;
  business: "sale" | "rent";
  price: number;
  ppm: number | null;
  drop_pct: number;
  type: string;
  typology: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  lat: number;
  lng: number;
  title: string;
  advertiser_type: "private" | "professional";
  advertiser_name: string | null;
  verified: boolean;
  published_at: Date;
  featured: boolean;
  energy_class: string | null;
  parish: string | null;
  municipality: string | null;
  image: string | null;
  n_listings: number;
  is_seed: boolean;
  sort_key: string;
}

export async function searchListings(f: SearchFilters, limit = PAGE_SIZE): Promise<SearchResult> {
  const conds = buildConditions(f);
  const spec = sortSpec(f);
  const cursor = decodeCursor(f.cursor);
  const where = cursor
    ? and([
        ...conds,
        spec.dir === "asc"
          ? sql`(${spec.expr}, l.id) > (${cursor[0]}::${sql.unsafe(spec.cast)}, ${cursor[1]}::uuid)`
          : sql`(${spec.expr}, l.id) < (${cursor[0]}::${sql.unsafe(spec.cast)}, ${cursor[1]}::uuid)`,
      ])
    : and(conds);
  const dir = sql.unsafe(spec.dir === "asc" ? "ASC" : "DESC");

  const [rows, [{ count } = { count: "0" }]] = await Promise.all([
    sql<Row[]>`
      SELECT l.id, p.id AS property_id, p.reference, l.business, l.price::float8 AS price, l.price_per_m2::float8 AS ppm,
             l.price_drop_pct::float8 AS drop_pct, p.type, p.typology, p.usable_area::float8 AS area, p.bedrooms, p.bathrooms,
             p.lat, p.lng, l.title, l.advertiser_type, l.advertiser_name, l.verified, l.published_at, l.featured, p.energy_class,
             pa.name AS parish, mu.name AS municipality, p.is_seed,
             (SELECT m.url FROM listing_media m WHERE m.listing_id = l.id ORDER BY m.position LIMIT 1) AS image,
             (SELECT count(*) FROM listings o WHERE o.property_id = p.id AND o.status = 'active' AND o.deleted_at IS NULL)::int AS n_listings,
             (${spec.expr})::text AS sort_key
      FROM listings l
      JOIN properties p ON p.id = l.property_id
      LEFT JOIN geo_parishes pa ON pa.code = p.parish_code
      LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
      WHERE ${where}
      ORDER BY ${spec.expr} ${dir}, l.id ${dir}
      LIMIT ${limit + 1}`,
    sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM listings l JOIN properties p ON p.id = l.property_id WHERE ${and(conds)}`,
  ]);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    total: Number(count),
    nextCursor: hasMore && last ? encodeCursor(last.sort_key, last.id) : null,
    items: page.map((r) => ({
      id: r.id,
      propertyId: r.property_id,
      reference: r.reference,
      business: r.business,
      price: r.price,
      pricePerM2: r.ppm,
      dropPct: r.drop_pct,
      type: r.type,
      typology: r.typology,
      area: r.area,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      lat: r.lat,
      lng: r.lng,
      title: r.title,
      advertiserType: r.advertiser_type,
      advertiserName: r.advertiser_name,
      verified: r.verified,
      publishedAt: r.published_at.toISOString(),
      featured: r.featured,
      energy: r.energy_class,
      parish: r.parish,
      municipality: r.municipality,
      image: r.image,
      listingCount: r.n_listings,
      isSeed: r.is_seed,
    })),
  };
}

/** Compact points for the map layer (clustering happens client-side with MapLibre). */
export async function searchMapPoints(f: SearchFilters): Promise<{ points: MapPoint[]; total: number; truncated: boolean }> {
  const where = and(buildConditions(f));
  const rows = await sql<{ id: string; lng: number; lat: number; price: number }[]>`
    SELECT l.id, p.lng, p.lat, l.price::float8 AS price
    FROM listings l JOIN properties p ON p.id = l.property_id
    WHERE ${where}
    ORDER BY l.published_at DESC
    LIMIT ${MAP_POINT_LIMIT + 1}`;
  const truncated = rows.length > MAP_POINT_LIMIT;
  const slice = truncated ? rows.slice(0, MAP_POINT_LIMIT) : rows;
  let total = slice.length;
  if (truncated) {
    const [r] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM listings l JOIN properties p ON p.id = l.property_id WHERE ${where}`;
    total = Number(r?.count ?? slice.length);
  }
  return { points: slice.map((r) => ({ id: r.id, x: r.lng, y: r.lat, p: r.price })), total, truncated };
}

/** Agencies with active listings, for the agency filter. */
export async function listAgencies(limit = 60): Promise<{ id: string; name: string }[]> {
  return sql<{ id: string; name: string }[]>`
    SELECT o.id, o.name FROM organizations o
    WHERE o.deleted_at IS NULL AND EXISTS (SELECT 1 FROM listings l WHERE l.agency_id = o.id AND l.status = 'active' AND l.is_primary)
    ORDER BY o.name LIMIT ${limit}`;
}

/** Single result card by listing id (used by the map pin preview). */
export async function getResultById(id: string): Promise<ResultItem | null> {
  const f = { ...parseFilters("sale", new URLSearchParams()), id };
  const r = await searchListings(f, 1);
  return r.items[0] ?? null;
}
