import { z } from "zod";
import { sql } from "@/db";
import { PARAMS, valuate, type Candidate, type Comparable, type Condition, type ModelResult, type Subject } from "@/lib/avm/model";

export const valuationInput = z.object({
  lat: z.coerce.number().min(29).max(43),
  lng: z.coerce.number().min(-35).max(-5),
  address: z.string().trim().max(200).optional(),
  postalCode: z.string().trim().max(10).optional(),
  cadastralRef: z.string().trim().max(40).optional(),
  type: z.enum(["apartment", "house", "shop", "office", "warehouse", "garage", "building"]),
  typology: z.coerce.number().int().min(0).max(5).optional(),
  area: z.coerce.number().min(10).max(5000),
  yearBuilt: z.coerce.number().int().min(1500).max(2100).optional(),
  condition: z.enum(["new", "used", "to_renovate", "under_construction"]).optional(),
  floor: z.coerce.number().int().min(-3).max(60).optional(),
  elevator: z.boolean().optional(),
});
export type ValuationInput = z.infer<typeof valuationInput>;

export interface PublicComparable {
  id: string;
  reference: string;
  title: string;
  kind: "active" | "sold" | "rented";
  price: number;
  area: number;
  pricePerM2: number;
  adjustedPpm: number;
  adjustedPrice: number;
  similarity: number;
  distanceM: number;
  adjustments: { condition: number; floor: number; area: number };
}

export interface ValuationOutcome {
  input: ValuationInput;
  computedAt: string;
  radiusM: number;
  sale: (Omit<ModelResult, "comparables"> & { comparables: PublicComparable[] }) | null;
  rent: (Omit<ModelResult, "comparables"> & { comparables: PublicComparable[] }) | null;
  grossYield: number | null;
  method: string;
}

const toPublic = (c: Comparable): PublicComparable => ({
  id: c.id, reference: c.reference, title: c.title, kind: c.kind, price: c.price, area: c.area, pricePerM2: c.pricePerM2,
  adjustedPpm: Math.round(c.adjustedPpm * 100) / 100, adjustedPrice: Math.round(c.adjustedPrice), similarity: Math.round(c.similarity * 100) / 100,
  distanceM: Math.round(c.distanceM), adjustments: c.adjustments,
});

type Row = { id: string; reference: string; title: string; status: string; price: number; ppm: number; area: number; typology: number | null; year_built: number | null; condition: Condition | null; floor: number | null; elevator: boolean; dist: number; months: number };

async function fetchCandidates(input: ValuationInput, business: "sale" | "rent", radiusM: number): Promise<Candidate[]> {
  const ended = business === "sale" ? "sold" : "rented";
  const rows = await sql<Row[]>`
    SELECT l.id, p.reference, l.title, l.status, l.price::float8 AS price, l.price_per_m2::float8 AS ppm, p.usable_area::float8 AS area, p.typology, p.year_built,
           p.condition, p.floor, p.elevator,
           ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography) AS dist,
           CASE WHEN l.status = 'active' THEN 0 ELSE GREATEST(EXTRACT(epoch FROM now() - l.ended_at) / 2629800, 0) END AS months
    FROM listings l JOIN properties p ON p.id = l.property_id
    WHERE p.type = ${input.type}::property_type AND l.business = ${business} AND p.deleted_at IS NULL AND l.deleted_at IS NULL
      AND p.usable_area BETWEEN ${input.area * 0.6} AND ${input.area * 1.6} AND l.price_per_m2 IS NOT NULL
      AND ((l.status = 'active' AND l.is_primary) OR (l.status = ${ended} AND l.ended_at > now() - make_interval(months => ${PARAMS.maxMonths})))
      AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography, ${radiusM})
    ORDER BY p.location <-> ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography LIMIT 80`;
  return rows.map((r) => ({
    id: r.id, reference: r.reference, title: r.title, kind: r.status === "active" ? "active" : (r.status as "sold" | "rented"),
    price: r.price, pricePerM2: r.ppm, area: r.area, typology: r.typology, yearBuilt: r.year_built, condition: r.condition, floor: r.floor, elevator: r.elevator,
    distanceM: r.dist, monthsAgo: Number(r.months),
  }));
}

/** Widens the search radius until there are enough comparables, then values the subject. */
async function valueFor(subject: Subject, input: ValuationInput, business: "sale" | "rent") {
  let last: { res: ModelResult | null; radius: number } = { res: null, radius: PARAMS.radiiM[PARAMS.radiiM.length - 1]! };
  for (const radius of PARAMS.radiiM) {
    const cands = await fetchCandidates(input, business, radius);
    const res = valuate(subject, cands, radius);
    last = { res, radius };
    if (cands.length >= PARAMS.targetComparables && res) break;
  }
  return last;
}

export async function runValuation(input: ValuationInput): Promise<ValuationOutcome> {
  const subject: Subject = { lat: input.lat, lng: input.lng, type: input.type, typology: input.typology ?? null, area: input.area, yearBuilt: input.yearBuilt ?? null, condition: input.condition ?? null, floor: input.floor ?? null, elevator: input.elevator };
  const [saleRun, rentRun] = await Promise.all([valueFor(subject, input, "sale"), valueFor(subject, input, "rent")]);
  const slim = (r: ModelResult | null) => (r ? { ...r, comparables: r.comparables.slice(0, 12).map(toPublic) } : null);
  const sale = slim(saleRun.res);
  const rent = slim(rentRun.res);
  return {
    input,
    computedAt: new Date().toISOString(),
    radiusM: saleRun.radius,
    sale,
    rent,
    grossYield: sale && rent && sale.value > 0 ? Math.round(((rent.value * 12) / sale.value) * 1e4) / 1e4 : null,
    method: "weighted_median_v1",
  };
}
