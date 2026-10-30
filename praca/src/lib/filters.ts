import { z } from "zod";

import { decodeZones, encodeZones, type Ring } from "./zones";

export const PROPERTY_TYPES = ["apartment", "house", "land", "shop", "office", "warehouse", "garage", "building"] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** URL slug (pt-PT) for each property type — used in /comprar/apartamento/... */
export const TYPE_SLUG: Record<PropertyType, string> = {
  apartment: "apartamento",
  house: "moradia",
  land: "terreno",
  shop: "loja",
  office: "escritorio",
  warehouse: "armazem",
  garage: "garagem",
  building: "predio",
};
export const SLUG_TYPE = Object.fromEntries(Object.entries(TYPE_SLUG).map(([k, v]) => [v, k as PropertyType])) as Record<string, PropertyType>;

export const CONDITIONS = ["new", "used", "to_renovate", "under_construction"] as const;
export const CONDITION_SLUG: Record<(typeof CONDITIONS)[number], string> = {
  new: "novo",
  used: "usado",
  to_renovate: "recuperar",
  under_construction: "construcao",
};
const SLUG_CONDITION = Object.fromEntries(Object.entries(CONDITION_SLUG).map(([k, v]) => [v, k])) as Record<string, (typeof CONDITIONS)[number]>;

export const ENERGY = ["A+", "A", "B", "B-", "C", "D", "E", "F", "exempt"] as const;
export const VIEWS = ["mar", "rio", "serra", "cidade", "jardim"] as const;
export const SORTS = ["relevance", "price_asc", "price_desc", "ppm_asc", "date_desc", "drop_desc", "dom_desc"] as const;
export type Sort = (typeof SORTS)[number];
export const PUBLISHED = ["1d", "7d", "30d"] as const;

export const PUBLISHED_DAYS: Record<(typeof PUBLISHED)[number], number> = { "1d": 1, "7d": 7, "30d": 30 };

export interface BBox {
  w: number;
  s: number;
  e: number;
  n: number;
}

export interface SearchFilters {
  business: "sale" | "rent";
  types: PropertyType[];
  typologies: number[]; // 0..5 (5 = T5+)
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  grossMin?: number;
  grossMax?: number;
  plotMin?: number;
  plotMax?: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  elevator?: boolean;
  balcony?: boolean;
  pool?: boolean;
  garden?: boolean;
  furnished?: boolean;
  pets?: boolean;
  priceDrop?: boolean;
  occupancy?: "free" | "tenanted";
  conditions: (typeof CONDITIONS)[number][];
  energy: (typeof ENERGY)[number][];
  yearMin?: number;
  yearMax?: number;
  floorMin?: number;
  floorMax?: number;
  views: (typeof VIEWS)[number][];
  published?: (typeof PUBLISHED)[number];
  advertiser?: "private" | "professional";
  agency?: string;
  q?: string;
  sort: Sort;
  bbox?: BBox;
  /** Free-hand zones drawn on the map (search in several areas at once). */
  zones: Ring[];
  /** Geographic codes resolved from the URL path (not serialised into the query string). */
  districtCode?: string;
  municipalityCode?: string;
  parishCode?: string;
  cursor?: string;
  /** Internal: restrict to a single listing (map pin card). Never parsed from the URL. */
  id?: string;
}

const num = z.coerce.number().finite();
const intRange = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

type Raw = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) =>
  (first(v) ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

function opt<T>(schema: z.ZodType<T>, v: string | undefined): T | undefined {
  if (v === undefined || v === "") return undefined;
  const r = schema.safeParse(v);
  return r.success ? r.data : undefined;
}
const flag = (v: string | undefined) => (v === "1" || v === "true" ? true : undefined);

export function toRaw(sp: URLSearchParams | Raw): Raw {
  if (sp instanceof URLSearchParams) {
    const out: Raw = {};
    sp.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  return sp;
}

export function parseBBox(v: string | undefined): BBox | undefined {
  if (!v) return undefined;
  const p = v.split(",").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n))) return undefined;
  const [w, s, e, n] = p as [number, number, number, number];
  if (w >= e || s >= n || w < -35 || e > -5 || s < 29 || n > 43) return undefined;
  return { w, s, e, n };
}

/** Parses a query string into validated filters. Unknown/invalid values are dropped, never thrown. */
export function parseFilters(business: "sale" | "rent", input: URLSearchParams | Raw): SearchFilters {
  const raw = toRaw(input);
  const g = (k: string) => first(raw[k]);
  const sort = opt(z.enum(SORTS), g("ordem")) ?? "relevance";
  return {
    business,
    types: list(raw.tipo).filter((t): t is PropertyType => (PROPERTY_TYPES as readonly string[]).includes(t)),
    typologies: [...new Set(list(raw.t).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 5))].sort(),
    priceMin: opt(num.min(0), g("pmin")),
    priceMax: opt(num.min(0), g("pmax")),
    areaMin: opt(num.min(0), g("amin")),
    areaMax: opt(num.min(0), g("amax")),
    grossMin: opt(num.min(0), g("bmin")),
    grossMax: opt(num.min(0), g("bmax")),
    plotMin: opt(num.min(0), g("terrmin")),
    plotMax: opt(num.min(0), g("terrmax")),
    bedrooms: opt(intRange(0, 10), g("quartos")),
    bathrooms: opt(intRange(0, 10), g("wc")),
    parking: opt(intRange(0, 10), g("park")),
    elevator: flag(g("elevador")),
    balcony: flag(g("varanda")),
    pool: flag(g("piscina")),
    garden: flag(g("jardim")),
    furnished: flag(g("mobilado")),
    pets: flag(g("animais")),
    priceDrop: flag(g("descida")),
    occupancy: opt(z.enum(["free", "tenanted"]), g("ocupacao") === "livre" ? "free" : g("ocupacao") === "arrendado" ? "tenanted" : undefined),
    conditions: [...new Set(list(raw.estado).map((s) => SLUG_CONDITION[s]).filter(Boolean))] as SearchFilters["conditions"],
    energy: list(raw.energia).map((s) => s.toUpperCase().replace("EXEMPT", "exempt")).filter((s): s is (typeof ENERGY)[number] => (ENERGY as readonly string[]).includes(s)),
    yearMin: opt(intRange(1500, 2100), g("anomin")),
    yearMax: opt(intRange(1500, 2100), g("anomax")),
    floorMin: opt(intRange(-3, 60), g("andarmin")),
    floorMax: opt(intRange(-3, 60), g("andarmax")),
    views: list(raw.vista).filter((s): s is (typeof VIEWS)[number] => (VIEWS as readonly string[]).includes(s)),
    published: opt(z.enum(PUBLISHED), g("pub")),
    advertiser: g("anunciante") === "particular" ? "private" : g("anunciante") === "profissional" ? "professional" : undefined,
    agency: opt(z.uuid(), g("agencia")),
    q: g("q")?.trim().slice(0, 120) || undefined,
    sort,
    bbox: parseBBox(g("bbox")),
    zones: decodeZones(g("zonas")),
    districtCode: opt(z.string().regex(/^\d{2}$/), g("d")),
    municipalityCode: opt(z.string().regex(/^\d{4}$/), g("m")),
    parishCode: opt(z.string().regex(/^\d{6}$/), g("f")),
    cursor: g("c") || undefined,
  };
}

const setIf = (p: URLSearchParams, k: string, v: unknown) => {
  if (v !== undefined && v !== null && v !== "" && v !== false) p.set(k, v === true ? "1" : String(v));
};

/** Serialises filters into a clean, shareable query string (defaults omitted). `cursor` is never serialised. */
export function filtersToParams(f: SearchFilters, opts: { includeGeo?: boolean; includeBBox?: boolean } = {}): URLSearchParams {
  const p = new URLSearchParams();
  if (f.types.length) p.set("tipo", f.types.join(","));
  if (f.typologies.length) p.set("t", f.typologies.join(","));
  setIf(p, "pmin", f.priceMin);
  setIf(p, "pmax", f.priceMax);
  setIf(p, "amin", f.areaMin);
  setIf(p, "amax", f.areaMax);
  setIf(p, "bmin", f.grossMin);
  setIf(p, "bmax", f.grossMax);
  setIf(p, "terrmin", f.plotMin);
  setIf(p, "terrmax", f.plotMax);
  setIf(p, "quartos", f.bedrooms);
  setIf(p, "wc", f.bathrooms);
  setIf(p, "park", f.parking);
  setIf(p, "elevador", f.elevator);
  setIf(p, "varanda", f.balcony);
  setIf(p, "piscina", f.pool);
  setIf(p, "jardim", f.garden);
  setIf(p, "mobilado", f.furnished);
  setIf(p, "animais", f.pets);
  setIf(p, "descida", f.priceDrop);
  if (f.occupancy) p.set("ocupacao", f.occupancy === "free" ? "livre" : "arrendado");
  if (f.conditions.length) p.set("estado", f.conditions.map((c) => CONDITION_SLUG[c]).join(","));
  if (f.energy.length) p.set("energia", f.energy.map((e) => e.toLowerCase()).join(","));
  setIf(p, "anomin", f.yearMin);
  setIf(p, "anomax", f.yearMax);
  setIf(p, "andarmin", f.floorMin);
  setIf(p, "andarmax", f.floorMax);
  if (f.views.length) p.set("vista", f.views.join(","));
  setIf(p, "pub", f.published);
  if (f.advertiser) p.set("anunciante", f.advertiser === "private" ? "particular" : "profissional");
  setIf(p, "agencia", f.agency);
  setIf(p, "q", f.q);
  if (f.sort !== "relevance") p.set("ordem", f.sort);
  if (opts.includeBBox !== false && f.bbox) p.set("bbox", [f.bbox.w, f.bbox.s, f.bbox.e, f.bbox.n].map((n) => n.toFixed(5)).join(","));
  if (f.zones.length) p.set("zonas", encodeZones(f.zones));
  if (opts.includeGeo) {
    setIf(p, "d", f.districtCode);
    setIf(p, "m", f.municipalityCode);
    setIf(p, "f", f.parishCode);
  }
  return p;
}

/** Number of active filters, for the "Filtros (3)" badge. Business, sort and geo are not counted. */
export function countActiveFilters(f: SearchFilters): number {
  const p = filtersToParams(f, { includeBBox: false });
  p.delete("ordem");
  p.delete("q");
  let n = 0;
  const groups = new Set<string>();
  p.forEach((_v, k) => {
    const g = k.replace(/(min|max)$/, "");
    if (!groups.has(g)) {
      groups.add(g);
      n++;
    }
  });
  return n + (f.q ? 1 : 0);
}

export function typeFromSlug(s: string | undefined): PropertyType | undefined {
  return s ? SLUG_TYPE[s] : undefined;
}
