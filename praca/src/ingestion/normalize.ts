import type { RawRecord } from "./types";
import { normalizedListingSchema, type NormalizedListing } from "./types";

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** "1.234,56" / "1 234,56" / "1234.56" / "€ 250.000" → number. */
export function parseNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  let s = String(v).replace(/[^\d,.\-]/g, "");
  if (!s) return undefined;
  const lastComma = s.lastIndexOf(","), lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lastComma > -1) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  else if (lastDot > -1 && /\.\d{3}$/.test(s) && (s.match(/\./g) ?? []).length >= 1 && !/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function parseBool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v == null || v === "") return undefined;
  const s = strip(String(v));
  if (["1", "true", "sim", "yes", "y", "s", "x"].includes(s)) return true;
  if (["0", "false", "nao", "no", "n"].includes(s)) return false;
  return undefined;
}

const TYPE_MAP: [RegExp, NormalizedListing["type"]][] = [
  [/apart|flat|andar|duplex|penthouse|studio|estudio|loft|t\d/, "apartment"],
  [/moradia|villa|house|casa|chalet|quinta|townhouse|bungalow|finca|farm/, "house"],
  [/terreno|land|plot|lote|rustico|urbano.*lote/, "land"],
  [/loja|shop|retail|comercial|store/, "shop"],
  [/escrit|office/, "office"],
  [/armaz|warehouse|industrial|pavilh/, "warehouse"],
  [/garag|parking|estacionamento/, "garage"],
  [/predio|building/, "building"],
];

export function mapType(v: unknown): NormalizedListing["type"] | undefined {
  if (v == null) return undefined;
  const s = strip(String(v));
  return TYPE_MAP.find(([re]) => re.test(s))?.[1];
}

export function mapBusiness(v: unknown): "sale" | "rent" | undefined {
  if (v == null) return undefined;
  const s = strip(String(v));
  if (/venda|sale|comprar|buy|sell/.test(s)) return "sale";
  if (/arrend|rent|aluguer|alugar|let/.test(s)) return "rent";
  return undefined;
}

export function mapCondition(v: unknown): NormalizedListing["condition"] | undefined {
  if (v == null || v === "") return undefined;
  const s = strip(String(v));
  if (/constru|under|planta|plan/.test(s)) return "under_construction";
  if (/recuper|renov|reabilit|ruina|to renovate|refurb/.test(s)) return "to_renovate";
  if (/novo|new|nova/.test(s)) return "new";
  if (/usado|used|bom|good|renovad|remodel|segunda/.test(s)) return "used";
  return undefined;
}

export function mapEnergy(v: unknown): NormalizedListing["energyClass"] | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).trim().toUpperCase().replace(/\s/g, "");
  if (/ISENT|EXEMPT/.test(s)) return "exempt";
  if (s === "A+") return "A+";
  if (s === "B-") return "B-";
  return (["A", "B", "C", "D", "E", "F"] as const).find((x) => x === s) as NormalizedListing["energyClass"] | undefined;
}

/** "T2", "T2+1", "2 quartos" are typology hints; returns 0..5. */
export function parseTypology(v: unknown, bedrooms?: number): number | undefined {
  if (v != null && v !== "") {
    const m = /t\s*(\d)/i.exec(String(v));
    if (m) return Math.min(5, Number(m[1]));
    const n = parseNumber(v);
    if (n != null && n >= 0 && n <= 20) return Math.min(5, Math.round(n));
  }
  return bedrooms != null ? Math.min(5, bedrooms) : undefined;
}

export function normalizePostalCode(v: unknown): string | undefined {
  if (v == null) return undefined;
  const m = /(\d{4})\s*-?\s*(\d{3})/.exec(String(v));
  return m ? `${m[1]}-${m[2]}` : undefined;
}

export function parseDate(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (v == null || v === "") return undefined;
  const s = String(v).trim();
  const br = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  const d = br ? new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1]))) : new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Sources often send 0 for "not applicable" (e.g. plot = 0 for a flat): treat as missing. */
const positive = (n: number | undefined) => (n != null && n > 0 ? n : undefined);

const str = (v: unknown, max = 300) => (v == null || v === "" ? undefined : String(v).trim().slice(0, max) || undefined);

/** Canonical field names accepted from adapters (CSV mapping targets, JSON keys, Kyero conversion output). */
export const FIELD_ALIASES: Record<string, string[]> = {
  externalId: ["externalid", "id", "ref", "referencia", "reference", "codigo", "listing_id"],
  business: ["business", "negocio", "operacao", "operation", "tipo_negocio", "price_freq"],
  type: ["type", "tipo", "tipo_imovel", "property_type", "categoria", "category"],
  typology: ["typology", "tipologia"],
  price: ["price", "preco", "valor", "preco_pedido"],
  usableArea: ["usablearea", "area_util", "area", "surface_area", "m2", "built_area"],
  grossArea: ["grossarea", "area_bruta"],
  plotArea: ["plotarea", "area_terreno", "terreno", "plot"],
  bedrooms: ["bedrooms", "quartos", "beds", "assoalhadas"],
  bathrooms: ["bathrooms", "casas_de_banho", "wc", "baths"],
  yearBuilt: ["yearbuilt", "ano", "ano_construcao", "built", "year_built"],
  floor: ["floor", "andar", "piso"],
  condition: ["condition", "estado", "condicao"],
  energyClass: ["energyclass", "certificado_energetico", "energy_rating", "classe_energetica"],
  parkingSpaces: ["parkingspaces", "estacionamento", "garagem", "parking"],
  elevator: ["elevator", "elevador", "lift"],
  balcony: ["balcony", "varanda"],
  terrace: ["terrace", "terraco"],
  pool: ["pool", "piscina"],
  garden: ["garden", "jardim"],
  furnished: ["furnished", "mobilado"],
  petsAllowed: ["petsallowed", "aceita_animais", "pets"],
  address: ["address", "morada", "rua", "street"],
  postalCode: ["postalcode", "codigo_postal", "cp", "postcode", "zip"],
  parishName: ["parishname", "freguesia", "parish"],
  municipalityName: ["municipalityname", "concelho", "municipio", "town", "city"],
  districtName: ["districtname", "distrito", "province", "region"],
  lat: ["lat", "latitude"],
  lng: ["lng", "lon", "longitude", "long"],
  title: ["title", "titulo", "name"],
  description: ["description", "descricao", "desc", "texto"],
  advertiserType: ["advertisertype", "tipo_anunciante", "anunciante_tipo"],
  advertiserName: ["advertisername", "anunciante", "agencia", "agency"],
  contactEmail: ["contactemail", "email", "email_contacto"],
  contactPhone: ["contactphone", "telefone", "telemovel", "phone"],
  url: ["url", "link", "ligacao"],
  imageUrls: ["imageurls", "imagens", "images", "fotos", "photos"],
  publishedAt: ["publishedat", "data", "data_publicacao", "date"],
};

const norm = (k: string) => strip(k).replace(/[^a-z0-9_+]/g, "_");

/** Picks a field from a raw record by canonical name, explicit mapping or alias. */
function pick(raw: RawRecord, field: string, mapping?: Record<string, string>): unknown {
  if (mapping?.[field] && raw[mapping[field]!] !== undefined) return raw[mapping[field]!];
  const keys = new Map(Object.keys(raw).map((k) => [norm(k), k]));
  for (const a of [field.toLowerCase(), ...(FIELD_ALIASES[field] ?? [])]) {
    const k = keys.get(a);
    if (k !== undefined && raw[k] !== undefined && raw[k] !== "") return raw[k];
  }
  return undefined;
}

export type NormalizeResult = { ok: true; value: NormalizedListing } | { ok: false; error: string };

/** Raw record → validated NormalizedListing. Never throws: failures come back as readable messages. */
export function normalizeRecord(raw: RawRecord, ctx: { mapping?: Record<string, string>; defaultBusiness?: "sale" | "rent" } = {}): NormalizeResult {
  const g = (f: string) => pick(raw, f, ctx.mapping);
  const bedrooms = parseNumber(g("bedrooms"));
  const type = mapType(g("type")) ?? (parseTypology(g("typology")) != null ? "apartment" : undefined);
  const business = mapBusiness(g("business")) ?? ctx.defaultBusiness;
  const images = g("imageUrls");
  const imageUrls = Array.isArray(images) ? images.map(String) : typeof images === "string" ? images.split(/[|;,\s]+/).filter((u) => /^https?:\/\//.test(u)) : [];
  const advertiser = strip(String(g("advertiserType") ?? ""));
  const candidate = {
    externalId: str(g("externalId"), 120),
    business,
    type,
    typology: parseTypology(g("typology"), bedrooms),
    price: parseNumber(g("price")),
    usableArea: positive(parseNumber(g("usableArea"))),
    grossArea: positive(parseNumber(g("grossArea"))),
    plotArea: positive(parseNumber(g("plotArea"))),
    bedrooms: bedrooms != null ? Math.round(bedrooms) : undefined,
    bathrooms: (() => { const n = parseNumber(g("bathrooms")); return n != null ? Math.round(n) : undefined; })(),
    yearBuilt: (() => { const n = parseNumber(g("yearBuilt")); return n && n > 1500 ? Math.round(n) : undefined; })(),
    floor: (() => { const n = parseNumber(g("floor")); return n != null ? Math.round(n) : undefined; })(),
    condition: mapCondition(g("condition")),
    energyClass: mapEnergy(g("energyClass")),
    parkingSpaces: (() => { const v = g("parkingSpaces"); const n = parseNumber(v); return n != null ? Math.round(n) : parseBool(v) ? 1 : undefined; })(),
    elevator: parseBool(g("elevator")),
    balcony: parseBool(g("balcony")),
    terrace: parseBool(g("terrace")),
    pool: parseBool(g("pool")),
    garden: parseBool(g("garden")),
    furnished: parseBool(g("furnished")),
    petsAllowed: parseBool(g("petsAllowed")),
    address: str(g("address")),
    postalCode: normalizePostalCode(g("postalCode")),
    parishName: str(g("parishName"), 120),
    municipalityName: str(g("municipalityName"), 120),
    districtName: str(g("districtName"), 120),
    lat: parseNumber(g("lat")),
    lng: parseNumber(g("lng")),
    title: str(g("title")) ?? undefined,
    description: str(g("description"), 10000),
    advertiserType: /particular|private|owner|proprietario/.test(advertiser) ? "private" : "professional",
    advertiserName: str(g("advertiserName"), 160),
    contactEmail: str(g("contactEmail"), 200),
    contactPhone: str(g("contactPhone"), 40),
    url: (() => { const u = str(g("url"), 500); return u && /^https?:\/\//.test(u) ? u : undefined; })(),
    imageUrls,
    publishedAt: parseDate(g("publishedAt")),
  };
  // A title is required for display; derive a readable one when the source does not provide it.
  if (!candidate.title && candidate.type) {
    const typ = candidate.typology != null && (candidate.type === "apartment" || candidate.type === "house") ? ` T${candidate.typology}` : "";
    candidate.title = `${{ apartment: "Apartamento", house: "Moradia", land: "Terreno", shop: "Loja", office: "Escritório", warehouse: "Armazém", garage: "Garagem", building: "Prédio" }[candidate.type]}${typ}${candidate.municipalityName ? ` em ${candidate.municipalityName}` : ""}`;
  }
  const parsed = normalizedListingSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]!;
    return { ok: false, error: `${issue.path.join(".") || "registo"}: ${issue.message}` };
  }
  return { ok: true, value: parsed.data };
}
