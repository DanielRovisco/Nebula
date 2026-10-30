import type { SearchFilters } from "./filters";

/**
 * Deterministic natural-language parser for pt-PT and English property queries. It is rule-based on purpose: every
 * interpretation can be shown to the user as chips and edited, and nothing leaves the server. Phrases it cannot map to
 * a real filter (for instance "near the metro") are returned in `ignored` instead of being guessed.
 */
export interface NlChip {
  key: string;
  label: string;
}

export interface NlResult {
  filters: Partial<SearchFilters> & { business: "sale" | "rent" };
  chips: NlChip[];
  /** Text left over that looks like a place name, to be resolved against the geography. */
  place: string | null;
  /** Phrases recognised as intent but without a supported filter. */
  ignored: string[];
}

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

const TYPES: [RegExp, NonNullable<SearchFilters["types"]>[number], string][] = [
  [/\b(apartamentos?|apartments?|flats?)\b/, "apartment", "Apartamento"],
  [/\b(moradias?|vivendas?|villas?|houses?|casas?)\b/, "house", "Moradia"],
  [/\b(terrenos?|lotes?|land|plots?)\b/, "land", "Terreno"],
  [/\b(lojas?|shops?|retail)\b/, "shop", "Loja"],
  [/\b(escritorios?|offices?)\b/, "office", "Escritório"],
  [/\b(armazens?|armazem|warehouses?)\b/, "warehouse", "Armazém"],
  [/\b(predios?|buildings?)\b/, "building", "Prédio"],
];

const FLAGS: [RegExp, keyof SearchFilters, string, unknown?][] = [
  [/\b(varanda|balcony|balcao)\b/, "balcony", "Varanda"],
  [/\b(elevador|lift|elevator)\b/, "elevator", "Elevador"],
  [/\b(piscina|pool|swimming)\b/, "pool", "Piscina"],
  [/\b(jardim|garden)\b/, "garden", "Jardim"],
  [/\b(mobilad[oa]s?|furnished)\b/, "furnished", "Mobilado"],
  [/\b(aceita animais|animais|pets?|pet friendly)\b/, "pets", "Aceita animais"],
  [/\b(reducao de preco|preco reduzido|price drop|reduced)\b/, "priceDrop", "Preço reduzido"],
];

const IGNORED = [
  /\bperto d[oae]s? (metro|comboio|escola|praia|mar|hospital|universidade|centro)\b/,
  /\b(near|close to) (the )?(metro|train|school|beach|sea|hospital|university|centre|center)\b/,
  /\b(sossegad[oa]|quiet|luminos[oa]|bright|moderno|modern)\b/,
];

function parseAmount(raw: string, unit?: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  const u = (unit ?? "").toLowerCase();
  if (u === "k") return n * 1_000;
  if (u === "m" || u.startsWith("milh") || u.startsWith("mill")) return n * 1_000_000;
  if (u === "mil") return n * 1_000;
  return n;
}

const AMOUNT = String.raw`(\d{1,3}(?:[. ]\d{3})+|\d+(?:[.,]\d+)?)(?!\d)\s*(milhoes|milhao|millions?|mil|k|m(?![a-z0-9²]))?\s*(?:€|eur|euros?)?`;

function eur(n: number): string {
  return new Intl.NumberFormat("pt-PT").format(Math.round(n)) + " €";
}

export function parseNaturalQuery(input: string): NlResult {
  let t = " " + strip(input).replace(/\s+/g, " ").trim() + " ";
  const chips: NlChip[] = [];
  const f: NlResult["filters"] = { business: "sale" };
  const take = (re: RegExp): RegExpExecArray | null => {
    const m = re.exec(t);
    if (m) t = t.replace(m[0], " ");
    return m;
  };

  // Business
  if (take(/\b(arrendar|arrendamento|alugar|aluguer|alugo|renda|rent|rental|to rent|for rent)\b/)) {
    f.business = "rent";
    chips.push({ key: "business", label: "Arrendar" });
  } else if (take(/\b(comprar|compra|venda|vender|buy|to buy|for sale|sale)\b/)) {
    chips.push({ key: "business", label: "Comprar" });
  }

  // Ignored intents (reported, never guessed)
  const ignored: string[] = [];
  for (const re of IGNORED) {
    const m = take(re);
    if (m) ignored.push(m[0].trim());
  }

  // Price ranges
  const between = take(new RegExp(String.raw`\b(?:entre|between)\s+${AMOUNT}\s+(?:e|a|and|-)\s+${AMOUNT}`));
  if (between) {
    const a = parseAmount(between[1]!, between[2]);
    const b = parseAmount(between[3]!, between[4] ?? between[2]);
    f.priceMin = Math.min(a, b);
    f.priceMax = Math.max(a, b);
    chips.push({ key: "price", label: `${eur(f.priceMin)} a ${eur(f.priceMax)}` });
  } else {
    const max = take(new RegExp(String.raw`\b(?:ate|max(?:imo)?|up to|under|below|no maximo)\s+${AMOUNT}(?!\s*(?:m2|m²|metros))`)) ?? take(new RegExp(String.raw`<\s*${AMOUNT}`));
    if (max) {
      f.priceMax = parseAmount(max[1]!, max[2]);
      chips.push({ key: "priceMax", label: `Até ${eur(f.priceMax)}` });
    }
    const min = take(new RegExp(String.raw`\b(?:mais de|acima de|a partir de|min(?:imo)?|from|over|above)\s+${AMOUNT}(?!\s*(?:m2|m²|metros|quartos|assoalhadas))`));
    if (min) {
      f.priceMin = parseAmount(min[1]!, min[2]);
      chips.push({ key: "priceMin", label: `Desde ${eur(f.priceMin)}` });
    }
  }

  // Area
  const areaMin = take(/\b(?:mais de|minimo|min|pelo menos|at least|over|from)\s+(\d{2,4})\s*(?:m2|m²|metros)/) ?? take(/(\d{2,4})\s*(?:m2|m²)\s*\+/);
  if (areaMin) {
    f.areaMin = Number(areaMin[1]);
    chips.push({ key: "areaMin", label: `≥ ${f.areaMin} m²` });
  }
  const areaMax = take(/\b(?:ate|max|maximo|up to|under)\s+(\d{2,4})\s*(?:m2|m²|metros)/);
  if (areaMax) {
    f.areaMax = Number(areaMax[1]);
    chips.push({ key: "areaMax", label: `≤ ${f.areaMax} m²` });
  }

  // Typology: T2, T2+, "2 quartos", "3 bedrooms"
  const typos = new Set<number>();
  let m: RegExpExecArray | null;
  const tre = /\bt\s?([0-5])(\+)?(?=\W)/g;
  while ((m = tre.exec(t))) {
    const n = Number(m[1]);
    typos.add(n);
    if (m[2]) for (let k = n + 1; k <= 5; k++) typos.add(k);
  }
  t = t.replace(/\bt\s?[0-5]\+?(?=\W)/g, " ");
  const beds = take(/\b(\d)\s*(?:\+\s*)?(?:quartos?|assoalhadas?|bedrooms?|beds?|dormitorios?)\b/);
  if (beds) {
    const n = Math.min(5, Number(beds[1]));
    f.bedrooms = n;
    chips.push({ key: "bedrooms", label: `${n}+ quartos` });
  }
  if (typos.size) {
    f.typologies = [...typos].sort();
    chips.push({ key: "typologies", label: f.typologies.map((n) => (n === 5 ? "T5+" : `T${n}`)).join(", ") });
  }
  const baths = take(/\b(\d)\s*(?:casas de banho|wcs?|bathrooms?|baths?)\b/);
  if (baths) {
    f.bathrooms = Number(baths[1]);
    chips.push({ key: "bathrooms", label: `${f.bathrooms}+ casas de banho` });
  }

  // Types
  const types = new Set<NonNullable<SearchFilters["types"]>[number]>();
  for (const [re, type, label] of TYPES) {
    if (take(re)) {
      types.add(type);
      chips.push({ key: `type:${type}`, label });
    }
  }
  // "com garagem" means parking, "garagem" alone is the property type.
  if (take(/\b(?:com|with)\s+(?:garagem|estacionamento|parking|garage|lugar de garagem)\b/) || take(/\b(estacionamento|parking)\b/)) {
    f.parking = 1;
    chips.push({ key: "parking", label: "Estacionamento" });
  } else if (take(/\b(garagem|garagens|garages?)\b/)) {
    types.add("garage");
    chips.push({ key: "type:garage", label: "Garagem" });
  }
  if (types.size) f.types = [...types];

  // Flags, conditions, views, energy
  const conditions: NonNullable<SearchFilters["conditions"]> = [];
  if (take(/\b(novo|nova|new build|brand new)\b/)) {
    conditions.push("new");
    chips.push({ key: "cond:new", label: "Novo" });
  }
  if (take(/\b(usad[oa]|used|resale)\b/)) {
    conditions.push("used");
    chips.push({ key: "cond:used", label: "Usado" });
  }
  if (take(/\b(para recuperar|a recuperar|para remodelar|to renovate|fixer upper)\b/)) {
    conditions.push("to_renovate");
    chips.push({ key: "cond:renovate", label: "Para recuperar" });
  }
  if (conditions.length) f.conditions = conditions;
  for (const [re, key, label] of FLAGS) {
    if (take(re)) {
      (f as Record<string, unknown>)[key] = true;
      chips.push({ key: String(key), label });
    }
  }
  const views: NonNullable<SearchFilters["views"]> = [];
  for (const [re, v, label] of [
    [/\bvista (?:de |para o |para )?(?:mar|oceano)\b|\bsea view|ocean view\b/, "mar", "Vista mar"],
    [/\bvista (?:de |para o |para )?rio\b|\briver view\b/, "rio", "Vista rio"],
    [/\bvista (?:de |para a )?serra\b|\bmountain view\b/, "serra", "Vista serra"],
  ] as const) {
    if (take(re)) {
      views.push(v);
      chips.push({ key: `view:${v}`, label });
    }
  }
  if (views.length) f.views = views;
  const en = take(/\b(?:classe|class|certificado)\s+(a\+|a|b-|b|c)\b/);
  if (en) {
    const k = en[1]!.toUpperCase() as "A+" | "A" | "B" | "B-" | "C";
    const order = ["A+", "A", "B", "B-", "C"] as const;
    f.energy = order.slice(0, order.indexOf(k) + 1) as unknown as NonNullable<SearchFilters["energy"]>;
    chips.push({ key: "energy", label: `Classe ${k} ou melhor` });
  }
  if (take(/\b(particular|sem agencia|sem comissao|private seller|by owner|fsbo)\b/)) {
    f.advertiser = "private";
    chips.push({ key: "advertiser", label: "Particular" });
  }

  // Place: what remains after removing filler words.
  const leftover = t
    .replace(/\b(procuro|quero|preciso de|gostava de|uma?|um|o|a|os|as|de|do|da|dos|das|com|sem|e|ou|em|no|na|nos|nas|perto|zona|zona de|i am looking for|looking for|find|me|show|in|near|with|and|the|an?|for|that|has|have|que|tenha|tem|ate|max|min|por|euros?|eur|mes|mensais?|month|per)\b/g, " ")
    .replace(/[€\d,.+<>-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const place = leftover.length >= 2 ? leftover : null;
  if (place) chips.push({ key: "place", label: place.replace(/\b\w/g, (c) => c.toUpperCase()) });
  return { filters: f, chips, place, ignored };
}
