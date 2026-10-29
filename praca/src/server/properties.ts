import { sql } from "@/db";
import { estimateFromComparables, type Estimate } from "@/lib/estimate";
import { distanceMeters } from "@/lib/geo-math";

export interface PropertyListing {
  id: string;
  business: "sale" | "rent";
  price: number;
  initialPrice: number;
  pricePerM2: number | null;
  dropPct: number;
  status: string;
  isPrimary: boolean;
  advertiserType: "private" | "professional";
  advertiserName: string | null;
  verified: boolean;
  title: string;
  description: string | null;
  videoUrl: string | null;
  tourUrl: string | null;
  contactPhone: string | null;
  url: string | null;
  publishedAt: string;
  sourceName: string;
  isSeed: boolean;
}

export interface PropertyDetail {
  id: string;
  reference: string;
  type: string;
  typology: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  usableArea: number | null;
  grossArea: number | null;
  plotArea: number | null;
  yearBuilt: number | null;
  floor: number | null;
  totalFloors: number | null;
  condition: string | null;
  energyClass: string | null;
  parkingSpaces: number;
  elevator: boolean;
  balcony: boolean;
  terrace: boolean;
  pool: boolean;
  garden: boolean;
  view: string | null;
  furnished: boolean | null;
  petsAllowed: boolean | null;
  tenanted: boolean;
  address: string | null;
  postalCode: string | null;
  lat: number;
  lng: number;
  isSeed: boolean;
  geo: {
    parish?: { name: string; slug: string; code: string };
    municipality?: { name: string; slug: string; code: string };
    district?: { name: string; slug: string; code: string };
  };
  primary: PropertyListing;
  others: PropertyListing[];
  media: { url: string; alt: string | null; illustrative: boolean }[];
  priceHistory: { at: string; price: number }[];
  events: { type: string; at: string; from: number | null; to: number | null }[];
}

export interface ComparableItem {
  id: string;
  reference: string;
  title: string;
  price: number;
  pricePerM2: number | null;
  area: number | null;
  typology: number | null;
  distance: number;
  similarity: number;
  image: string | null;
  parish: string | null;
}

export interface ZoneStats {
  level: "municipality" | "district" | "country";
  name: string;
  pricePerM2: number | null;
  yoy: number | null;
  qoq: number | null;
  n: number;
  grossYield: number | null;
  daysOnMarket: number | null;
  discount: number | null;
  aggregatedFrom: string | null;
  isSeed: boolean;
  period: string;
}

type Prop = Record<string, unknown>;

export async function getPropertyByReference(ref: string): Promise<PropertyDetail | null> {
  const [p] = await sql<Prop[]>`
    SELECT p.*, pa.name AS parish_name, pa.slug AS parish_slug, mu.name AS mun_name, mu.slug AS mun_slug, d.name AS dist_name, d.slug AS dist_slug
    FROM properties p
    LEFT JOIN geo_parishes pa ON pa.code = p.parish_code
    LEFT JOIN geo_municipalities mu ON mu.code = p.municipality_code
    LEFT JOIN geo_districts d ON d.code = p.district_code
    WHERE p.reference = ${ref.toUpperCase()} AND p.deleted_at IS NULL`;
  if (!p) return null;

  const listings = await sql<Prop[]>`
    SELECT l.*, s.name AS source_name FROM listings l JOIN sources s ON s.id = l.source_id
    WHERE l.property_id = ${p.id as string} AND l.deleted_at IS NULL AND l.status <> 'pending_review'
    ORDER BY l.is_primary DESC, l.published_at ASC`;
  if (!listings.length) return null;
  const mapL = (l: Prop): PropertyListing => ({
    id: l.id as string,
    business: l.business as "sale" | "rent",
    price: Number(l.price),
    initialPrice: Number(l.initial_price),
    pricePerM2: l.price_per_m2 != null ? Number(l.price_per_m2) : null,
    dropPct: Number(l.price_drop_pct),
    status: l.status as string,
    isPrimary: l.is_primary as boolean,
    advertiserType: l.advertiser_type as "private" | "professional",
    advertiserName: l.advertiser_name as string | null,
    verified: l.verified as boolean,
    title: l.title as string,
    description: l.description as string | null,
    videoUrl: l.video_url as string | null,
    tourUrl: l.tour_url as string | null,
    contactPhone: l.contact_phone as string | null,
    url: l.url as string | null,
    publishedAt: (l.published_at as Date).toISOString(),
    sourceName: l.source_name as string,
    isSeed: l.is_seed as boolean,
  });
  const mapped = listings.map(mapL);
  const primary = mapped.find((l) => l.isPrimary) ?? mapped[0]!;

  const [media, history, events] = await Promise.all([
    sql<{ url: string; alt: string | null; is_illustrative: boolean }[]>`
      SELECT url, alt, is_illustrative FROM listing_media WHERE listing_id = ${primary.id} ORDER BY position`,
    sql<{ recorded_at: Date; price: number }[]>`
      SELECT recorded_at, price::float8 AS price FROM listing_price_history WHERE listing_id = ${primary.id} ORDER BY recorded_at`,
    sql<{ type: string; occurred_at: Date; from_price: number | null; to_price: number | null }[]>`
      SELECT e.type, e.occurred_at, e.from_price::float8, e.to_price::float8 FROM listing_events e
      WHERE e.property_id = ${p.id as string} ORDER BY e.occurred_at DESC LIMIT 30`,
  ]);

  const n = (v: unknown) => (v == null ? null : Number(v));
  return {
    id: p.id as string,
    reference: p.reference as string,
    type: p.type as string,
    typology: n(p.typology),
    bedrooms: n(p.bedrooms),
    bathrooms: n(p.bathrooms),
    usableArea: n(p.usable_area),
    grossArea: n(p.gross_area),
    plotArea: n(p.plot_area),
    yearBuilt: n(p.year_built),
    floor: n(p.floor),
    totalFloors: n(p.total_floors),
    condition: p.condition as string | null,
    energyClass: p.energy_class as string | null,
    parkingSpaces: Number(p.parking_spaces),
    elevator: p.elevator as boolean,
    balcony: p.balcony as boolean,
    terrace: p.terrace as boolean,
    pool: p.pool as boolean,
    garden: p.garden as boolean,
    view: p.view as string | null,
    furnished: p.furnished as boolean | null,
    petsAllowed: p.pets_allowed as boolean | null,
    tenanted: p.tenanted as boolean,
    address: p.address as string | null,
    postalCode: p.postal_code as string | null,
    lat: Number(p.lat),
    lng: Number(p.lng),
    isSeed: p.is_seed as boolean,
    geo: {
      parish: p.parish_name ? { name: p.parish_name as string, slug: p.parish_slug as string, code: p.parish_code as string } : undefined,
      municipality: p.mun_name ? { name: p.mun_name as string, slug: p.mun_slug as string, code: p.municipality_code as string } : undefined,
      district: p.dist_name ? { name: p.dist_name as string, slug: p.dist_slug as string, code: p.district_code as string } : undefined,
    },
    primary,
    others: mapped.filter((l) => l !== primary && l.business === primary.business),
    media: media.map((m) => ({ url: m.url, alt: m.alt, illustrative: m.is_illustrative })),
    priceHistory: history.map((h) => ({ at: h.recorded_at.toISOString(), price: h.price })),
    events: events.map((e) => ({ type: e.type, at: e.occurred_at.toISOString(), from: e.from_price, to: e.to_price })),
  };
}

/** Similar active adverts around the property, nearest first, with a 0..1 similarity score. */
export async function getComparables(prop: PropertyDetail, limit = 12): Promise<ComparableItem[]> {
  const area = prop.usableArea ?? prop.plotArea;
  const rows = await sql<
    { id: string; reference: string; title: string; price: number; ppm: number | null; area: number | null; typology: number | null; lat: number; lng: number; image: string | null; parish: string | null; dist: number }[]
  >`
    SELECT l.id, p.reference, l.title, l.price::float8 AS price, l.price_per_m2::float8 AS ppm, p.usable_area::float8 AS area, p.typology,
           p.lat, p.lng, pa.name AS parish,
           (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image,
           ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${prop.lng}, ${prop.lat}), 4326)::geography) AS dist
    FROM properties p
    JOIN listings l ON l.property_id = p.id AND l.is_primary AND l.status = 'active' AND l.deleted_at IS NULL
    LEFT JOIN geo_parishes pa ON pa.code = p.parish_code
    WHERE p.id <> ${prop.id} AND p.deleted_at IS NULL
      AND l.business = ${prop.primary.business}
      AND p.type = ${prop.type}::property_type
      AND (${prop.typology}::smallint IS NULL OR p.typology = ${prop.typology}::smallint)
      AND (${area}::float8 IS NULL OR p.usable_area BETWEEN ${area ?? 0} * 0.7 AND ${area ?? 0} * 1.3 OR p.usable_area IS NULL)
      AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${prop.lng}, ${prop.lat}), 4326)::geography, 15000)
    ORDER BY p.location <-> ST_SetSRID(ST_MakePoint(${prop.lng}, ${prop.lat}), 4326)::geography
    LIMIT ${limit}`;

  return rows.map((r) => {
    const dScore = Math.max(0, 1 - r.dist / 15000);
    const aScore = area && r.area ? Math.max(0, 1 - Math.abs(r.area - area) / (0.3 * area)) : 0.5;
    const yScore = 1;
    return {
      id: r.id,
      reference: r.reference,
      title: r.title,
      price: r.price,
      pricePerM2: r.ppm,
      area: r.area,
      typology: r.typology,
      distance: Math.round(r.dist ?? distanceMeters(prop.lat, prop.lng, r.lat, r.lng)),
      similarity: Math.round((0.5 * dScore + 0.4 * aScore + 0.1 * yScore) * 100) / 100,
      image: r.image,
      parish: r.parish,
    };
  });
}

export function estimateFor(prop: PropertyDetail, comps: ComparableItem[]): Estimate | null {
  const area = prop.usableArea;
  if (!area) return null;
  return estimateFromComparables(
    comps.filter((c) => c.pricePerM2).map((c) => ({ pricePerM2: c.pricePerM2!, weight: Math.max(0.05, c.similarity) })),
    area,
  );
}

/** Latest zone indicators for a property, falling back municipality → district → country (and saying so). */
export async function getZoneStats(prop: PropertyDetail): Promise<ZoneStats | null> {
  const business = prop.primary.business;
  const rows = await sql<
    { geo_level: "municipality" | "district" | "country"; geo_code: string; ppm: number; yoy: number | null; qoq: number | null; n: number; gy: number | null; dom: number | null; disc: number | null; agg: string | null; is_seed: boolean; period: string }[]
  >`
    SELECT geo_level, geo_code, median_price_per_m2::float8 AS ppm, yoy_change::float8 AS yoy, qoq_change::float8 AS qoq, n,
           gross_yield::float8 AS gy, median_days_on_market AS dom, avg_asking_discount::float8 AS disc, aggregated_from AS agg, is_seed, period::text
    FROM market_indicators
    WHERE business = ${business} AND property_type IS NULL AND typology IS NULL AND source = 'computed'
      AND period = (SELECT max(period) FROM market_indicators WHERE source = 'computed')
      AND ((geo_level = 'municipality' AND geo_code = ${prop.geo.municipality?.code ?? ""})
        OR (geo_level = 'district' AND geo_code = ${prop.geo.district?.code ?? ""})
        OR geo_level = 'country')
    ORDER BY CASE geo_level WHEN 'municipality' THEN 1 WHEN 'district' THEN 2 ELSE 3 END`;
  const r = rows[0];
  if (!r) return null;
  const name = r.geo_level === "municipality" ? prop.geo.municipality?.name : r.geo_level === "district" ? prop.geo.district?.name : "Portugal";
  return {
    level: r.geo_level,
    name: name ?? "Portugal",
    pricePerM2: r.ppm,
    yoy: r.yoy,
    qoq: r.qoq,
    n: r.n,
    grossYield: r.gy,
    daysOnMarket: r.dom,
    discount: r.disc,
    aggregatedFrom: r.agg,
    isSeed: r.is_seed,
    period: r.period,
  };
}
