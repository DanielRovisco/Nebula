import { sql } from "@/db";

export const PHASES = ["planning", "licensing", "construction", "selling", "delivered"] as const;
export type Phase = (typeof PHASES)[number];

export interface DevelopmentCard {
  slug: string;
  name: string;
  developer: string;
  phase: Phase;
  municipality: string | null;
  totalUnits: number | null;
  availableUnits: number | null;
  expectedDelivery: string | null;
  priceFrom: number | null;
  isSeed: boolean;
}

export async function listDevelopments(): Promise<DevelopmentCard[]> {
  return sql<DevelopmentCard[]>`
    SELECT d.slug, d.name, d.developer, d.phase, m.name AS municipality, d.total_units AS "totalUnits", d.available_units AS "availableUnits",
           d.expected_delivery::text AS "expectedDelivery", d.price_from::float8 AS "priceFrom", d.is_seed AS "isSeed"
    FROM new_developments d LEFT JOIN geo_municipalities m ON m.code = d.municipality_code
    ORDER BY d.price_from NULLS LAST, d.name`;
}

export interface DevelopmentDetail extends DevelopmentCard {
  description: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  units: { typology: number | null; area: number | null; price: number | null; status: string; floor: number | null }[];
}

export async function getDevelopment(slug: string): Promise<DevelopmentDetail | null> {
  const [d] = await sql<Omit<DevelopmentDetail, "units">[]>`
    SELECT d.slug, d.name, d.developer, d.phase, m.name AS municipality, d.total_units AS "totalUnits", d.available_units AS "availableUnits",
           d.expected_delivery::text AS "expectedDelivery", d.price_from::float8 AS "priceFrom", d.is_seed AS "isSeed", d.description, d.website,
           d.lat::float8 AS lat, d.lng::float8 AS lng
    FROM new_developments d LEFT JOIN geo_municipalities m ON m.code = d.municipality_code WHERE d.slug = ${slug}`;
  if (!d) return null;
  const units = await sql<DevelopmentDetail["units"]>`
    SELECT u.typology, u.area::float8 AS area, u.price::float8 AS price, u.status, u.floor FROM development_units u
    JOIN new_developments d ON d.id = u.development_id WHERE d.slug = ${slug} ORDER BY u.typology NULLS LAST, u.price`;
  return { ...d, units };
}
