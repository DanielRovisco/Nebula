import { fingerprint } from "../../src/lib/fingerprint";
import { pointInPolygon } from "../../src/lib/geo-math";
import { uuidv7 } from "../../src/lib/ids";
import { AGENCIES, BIG_MARKETS, DISTRICT_BASE, MUNICIPALITY_PM2, STREETS } from "./catalog";
import type { ParishRef } from "./geo";
import { Rng, hashString } from "../../src/lib/rng";

type Row = Record<string, unknown>;

export interface SeedOutput {
  properties: Row[];
  listings: Row[];
  priceHistory: Row[];
  events: Row[];
  media: Row[];
  postcodes: Map<string, { code: string; parish: string; lat: number; lng: number }>;
  stats: { properties: number; listings: number; duplicates: number; fsbo: number };
}

export interface SeedContext {
  sourceIds: string[]; // feed sources (professional)
  privateSourceId: string;
  agencies: { id: string; name: string; verified: boolean }[];
  now: Date;
  target: number;
}

const DAY = 86_400_000;
const round = (n: number, step: number) => Math.round(n / step) * step;

const TYPE_LABEL: Record<string, string> = {
  apartment: "Apartamento",
  house: "Moradia",
  land: "Terreno",
  shop: "Loja",
  office: "Escritório",
  warehouse: "Armazém",
  garage: "Garagem",
  building: "Prédio",
};

function pickType(rng: Rng, pm2: number): string {
  if (pm2 >= 2200)
    return rng.weighted([["apartment", 78], ["house", 8], ["shop", 5], ["office", 4], ["garage", 3], ["land", 1], ["building", 1]]);
  if (pm2 >= 1300)
    return rng.weighted([["apartment", 55], ["house", 25], ["land", 6], ["shop", 4], ["office", 2], ["garage", 3], ["warehouse", 2], ["building", 3]]);
  return rng.weighted([["house", 50], ["apartment", 18], ["land", 18], ["shop", 2], ["warehouse", 4], ["building", 4], ["garage", 2]]);
}

function samplePoint(rng: Rng, p: ParishRef): [number, number] {
  const polys = p.polygons;
  const weights: [number, number][] = polys.map((poly, i) => {
    const xs = poly[0]!.map((c) => c[0]);
    const ys = poly[0]!.map((c) => c[1]);
    return [i, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)) + 1e-9];
  });
  for (let attempt = 0; attempt < 60; attempt++) {
    const poly = polys[rng.weighted(weights)]!;
    const xs = poly[0]!.map((c) => c[0]);
    const ys = poly[0]!.map((c) => c[1]);
    const lng = rng.between(Math.min(...xs), Math.max(...xs));
    const lat = rng.between(Math.min(...ys), Math.max(...ys));
    if (pointInPolygon(lng, lat, poly)) return [lng, lat];
  }
  return p.centroid;
}

const VIEWS = [["nenhuma", 62], ["cidade", 14], ["serra", 8], ["rio", 7], ["mar", 6], ["jardim", 3]] as const;

function describe(rng: Rng, t: Row, parish: ParishRef): string {
  const type = t.type as string;
  const area = t.usable_area as number | null;
  const cond = t.condition as string;
  const bits: string[] = [];
  const label = TYPE_LABEL[type]!.toLowerCase();
  const typ = t.typology != null && (type === "apartment" || type === "house") ? ` T${t.typology}` : "";
  bits.push(
    rng.pick([
      `${TYPE_LABEL[type]}${typ} situado em ${parish.name}, no concelho de ${parish.municipalityName}.`,
      `Excelente ${label}${typ} numa zona consolidada de ${parish.name} (${parish.municipalityName}).`,
      `${TYPE_LABEL[type]}${typ} com boa exposição solar e localização central em ${parish.name}.`,
    ]),
  );
  if (area) bits.push(`Tem ${Math.round(area)} m² de área útil${t.plot_area ? ` e um terreno de ${Math.round(t.plot_area as number)} m²` : ""}.`);
  if (cond === "new") bits.push("Construção nova, com acabamentos modernos e certificação energética elevada.");
  else if (cond === "to_renovate") bits.push("Necessita de obras de recuperação, uma oportunidade para quem procura adaptar o espaço ao seu gosto.");
  else if (cond === "under_construction") bits.push("Em construção, com entrega prevista nos próximos meses.");
  else bits.push(rng.pick(["Em bom estado de conservação.", "Bem conservado e pronto a habitar.", "Cuidado pelos proprietários e com materiais de qualidade."]));
  const feats: string[] = [];
  if (t.elevator) feats.push("elevador");
  if (t.balcony) feats.push("varanda");
  if (t.terrace) feats.push("terraço");
  if (t.pool) feats.push("piscina");
  if (t.garden) feats.push("jardim");
  if ((t.parking_spaces as number) > 0) feats.push(`${t.parking_spaces} lugar(es) de estacionamento`);
  if (feats.length) bits.push(`Inclui ${feats.join(", ")}.`);
  if (t.view && t.view !== "nenhuma") bits.push(`Vista ${t.view === "mar" ? "de mar" : t.view === "rio" ? "de rio" : t.view === "serra" ? "de serra" : t.view === "jardim" ? "de jardim" : "desafogada sobre a cidade"}.`);
  bits.push(rng.pick(["Perto de comércio, serviços e transportes.", "Zona com escolas, supermercados e acessos rápidos.", "Boas ligações rodoviárias e transportes públicos próximos."]));
  bits.push("Anúncio de demonstração: dados gerados para testar o portal.");
  return bits.join(" ");
}

function mediaCount(rng: Rng, type: string) {
  if (type === "garage" || type === "land") return rng.int(3, 6);
  return rng.int(6, 14);
}

const hex16 = (rng: Rng) =>
  Array.from({ length: 16 }, () => Math.floor(rng.float() * 16).toString(16)).join("");

export function generate(parishes: ParishRef[], ctx: SeedContext): SeedOutput {
  const rng = new Rng(20250101);
  const out: SeedOutput = {
    properties: [],
    listings: [],
    priceHistory: [],
    events: [],
    media: [],
    postcodes: new Map(),
    stats: { properties: 0, listings: 0, duplicates: 0, fsbo: 0 },
  };

  // ── allocate properties per municipality ──
  const byMun = new Map<string, ParishRef[]>();
  for (const p of parishes) {
    const a = byMun.get(p.municipalityCode) ?? [];
    a.push(p);
    byMun.set(p.municipalityCode, a);
  }
  const munInfo = [...byMun.entries()].map(([code, ps]) => {
    const name = ps[0]!.municipalityName;
    const pm2 = MUNICIPALITY_PM2[name] ?? DISTRICT_BASE[ps[0]!.districtCode] ?? 1200;
    const weight = Math.max(0.5, (pm2 / 1500) ** 1.3) * (BIG_MARKETS.has(name) ? 9 : 1) * Math.sqrt(ps.length);
    return { code, name, ps, pm2, weight };
  });
  const MIN_PER = 6;
  const remaining = Math.max(0, ctx.target - MIN_PER * munInfo.length);
  const totalW = munInfo.reduce((s, m) => s + m.weight, 0);
  const counts = new Map(munInfo.map((m) => [m.code, MIN_PER + Math.round((remaining * m.weight) / totalW)]));

  let refCounter = 0;
  const pubSrc = ctx.sourceIds;

  for (const m of munInfo) {
    const parishWeights: [ParishRef, number][] = m.ps.map((p) => [p, 1 / Math.sqrt(p.areaHa + 40)]);
    for (let i = 0; i < counts.get(m.code)!; i++) {
      const parish = rng.weighted(parishWeights);
      const parishFactor = Math.exp(((hashString(parish.code) % 1000) / 1000 - 0.5) * 0.4);
      const pm2 = m.pm2 * parishFactor;
      const [lng, lat] = samplePoint(rng, parish);
      const type = pickType(rng, pm2);
      const residential = type === "apartment" || type === "house";

      const typology = residential
        ? type === "house"
          ? rng.weighted([[2, 12], [3, 42], [4, 30], [5, 16]] as [number, number][])
          : rng.weighted([[0, 5], [1, 20], [2, 36], [3, 26], [4, 9], [5, 4]] as [number, number][])
        : null;
      const baseArea = [38, 55, 80, 105, 150, 215][typology ?? 2]!;
      let usable: number | null;
      let plot: number | null = null;
      if (residential) {
        usable = round(baseArea * rng.lognormal(0.14) * (type === "house" ? 1.25 : 1), 1);
        if (type === "house") plot = round(usable * rng.between(1.2, 6) * (pm2 > 2500 ? 0.6 : 1.6), 10);
      } else if (type === "land") {
        usable = null;
        plot = round(rng.lognormal(0.9) * (pm2 > 2200 ? 600 : 2500), 10);
      } else if (type === "garage") usable = round(rng.between(12, 30), 1);
      else if (type === "building") usable = round(rng.between(220, 900), 10);
      else if (type === "warehouse") usable = round(rng.lognormal(0.7) * 400, 10);
      else usable = round(rng.lognormal(0.5) * 90, 1);
      const gross = usable && type !== "garage" ? round(usable * rng.between(1.08, 1.22), 1) : null;

      // year & condition
      const year = type === "land" ? null : Math.min(2025, Math.round(1930 + 95 * Math.pow(rng.float(), 0.55)));
      let condition: string | null = null;
      if (type !== "land") {
        if (year! >= 2023) condition = rng.chance(0.85) ? "new" : "under_construction";
        else condition = rng.chance(year! < 1990 ? 0.28 : 0.1) ? "to_renovate" : "used";
        if (rng.chance(0.03) && condition === "used") condition = "new";
      }
      const energy =
        type === "land" || type === "garage"
          ? null
          : condition === "new" || condition === "under_construction"
            ? rng.weighted([["A+", 12], ["A", 45], ["B", 33], ["B-", 10]] as [string, number][])
            : year! >= 2006
              ? rng.weighted([["A", 8], ["B", 22], ["B-", 25], ["C", 30], ["D", 15]] as [string, number][])
              : rng.weighted([["C", 18], ["D", 28], ["E", 22], ["F", 20], ["exempt", 12]] as [string, number][]);

      const isApt = type === "apartment";
      const floor = isApt ? rng.weighted([[0, 14], [1, 20], [2, 18], [3, 15], [4, 11], [5, 8], [6, 6], [7, 4], [8, 4]] as [number, number][]) : null;
      const totalFloors = isApt ? floor! + rng.int(0, 5) + (floor! >= 5 ? 1 : 0) : type === "house" ? rng.int(1, 3) : null;
      const elevator = isApt ? (totalFloors! >= 4 ? rng.chance(0.88) : rng.chance(0.08)) : false;
      const luxury = pm2 > 3500;
      const balcony = isApt ? rng.chance(0.5) : false;
      const terrace = (isApt && rng.chance(0.18)) || (type === "house" && rng.chance(0.4));
      const pool = type === "house" ? rng.chance(luxury ? 0.4 : 0.2) : isApt ? rng.chance(luxury ? 0.12 : 0.04) : false;
      const garden = type === "house" ? rng.chance(0.65) : isApt ? rng.chance(0.06) : false;
      const parking = residential ? (type === "house" ? rng.int(0, 3) : rng.weighted([[0, 40], [1, 42], [2, 18]] as [number, number][])) : 0;
      const view = residential ? rng.weighted(VIEWS as unknown as [string, number][]) : null;
      const tenanted = rng.chance(0.04);

      // price (sale equivalent)
      const typeF: Record<string, number> = { apartment: 1, house: 1.05, shop: 0.9, office: 0.85, warehouse: 0.4, garage: 0.45, building: 0.8 };
      const condF: Record<string, number> = { new: 1.18, under_construction: 1.1, used: 1 - Math.min(0.2, (2025 - (year ?? 2000)) / 400), to_renovate: 0.68 };
      const enF: Record<string, number> = { "A+": 1.04, A: 1.03, B: 1.01, "B-": 1, C: 1, D: 0.98, E: 0.96, F: 0.94, exempt: 0.95 };
      let factor = (typeF[type] ?? 1) * (condition ? condF[condition]! : 1) * (energy ? enF[energy]! : 1);
      if (elevator) factor *= 1.03;
      if (pool) factor *= 1.06;
      if (terrace) factor *= 1.04;
      factor *= 1 + 0.025 * parking;
      if (view === "mar") factor *= 1.08;
      else if (view === "rio") factor *= 1.03;
      if (isApt) factor *= floor === 0 ? 0.97 : 1 + 0.012 * Math.min(floor!, 6) * (elevator ? 1 : 0.2);
      factor *= rng.lognormal(0.11);
      let saleEq: number;
      if (type === "land") saleEq = plot! * pm2 * (pm2 > 2200 ? 0.18 : 0.1) * rng.lognormal(0.3);
      else saleEq = usable! * pm2 * factor;
      saleEq = Math.max(saleEq, type === "garage" ? 8000 : 15000);

      const rentable = type !== "land";
      const business: "sale" | "rent" = rentable && rng.chance(0.27) ? "rent" : "sale";
      const yieldAnnual = 0.04 + 0.03 * (1 - Math.min(1, pm2 / 5500)) + rng.between(-0.004, 0.004);
      const price0 = business === "sale" ? (saleEq > 80000 ? round(saleEq, 1000) : round(saleEq, 500)) : Math.max(60, round((saleEq * yieldAnnual) / 12, 10));

      // address / postcode
      const street = rng.pick(STREETS);
      const addr = `${street} ${rng.int(1, 180)}${isApt ? `, ${floor === 0 ? "R/C" : floor + ".º"} ${rng.pick(["Esq.", "Dto.", "A", "B", "C"])}` : ""}`;
      const pcBase = 1000 + (hashString(parish.code) % 8990);
      const postal = `${pcBase}-${String(rng.int(1, 999)).padStart(3, "0")}`;
      if (!out.postcodes.has(postal)) out.postcodes.set(postal, { code: postal, parish: parish.code, lat, lng });

      const propertyId = uuidv7(ctx.now.getTime() - 1_000_000 + out.properties.length);
      refCounter++;
      const prop: Row = {
        id: propertyId,
        reference: `PR-${String(refCounter).padStart(6, "0")}`,
        fingerprint: fingerprint({ type, typology, usableArea: usable, floor, lat, lng }),
        type,
        typology,
        bedrooms: residential ? Math.max(typology ?? 0, typology === 0 ? 0 : 1) : null,
        bathrooms: residential ? Math.max(1, Math.min(typology ?? 1, rng.int(1, Math.max(1, (typology ?? 1) - 0)))) : type === "shop" || type === "office" ? 1 : null,
        usable_area: usable,
        gross_area: gross,
        plot_area: plot,
        year_built: year,
        floor,
        total_floors: totalFloors,
        condition,
        energy_class: energy,
        parking_spaces: parking,
        elevator,
        balcony,
        terrace,
        pool,
        garden,
        view: view === "nenhuma" ? null : view,
        furnished: business === "rent" && residential ? rng.chance(0.4) : null,
        pets_allowed: business === "rent" && residential ? rng.chance(0.35) : null,
        tenanted: business === "sale" && tenanted,
        address: addr,
        postal_code: postal,
        district_code: parish.districtCode,
        municipality_code: parish.municipalityCode,
        parish_code: parish.code,
        lat: Math.round(lat * 1e6) / 1e6,
        lng: Math.round(lng * 1e6) / 1e6,
        geo_precision: "exact",
        is_seed: true,
      };
      out.properties.push(prop);

      // ── listings (one canonical + optional duplicates on other sources) ──
      const dupCount = rng.chance(0.14) ? rng.int(1, 2) : 0;
      const isPrivate = dupCount === 0 && rng.chance(0.13);
      const age = Math.min(700, Math.round(-Math.log(1 - rng.float() * 0.999) * 75));
      const publishedAt = new Date(ctx.now.getTime() - age * DAY - rng.int(0, 86_400) * 1000);
      let status = rng.weighted([["active", 91], ["withdrawn", 4], [business === "sale" ? "sold" : "rented", 5]] as [string, number][]);
      if (rng.chance(0.004)) status = "pending_review";
      const ppm = (p: number) => (usable ? Math.round((p / usable) * 100) / 100 : plot && type === "land" ? Math.round((p / plot) * 100) / 100 : null);

      const buildListing = (idx: number, isPrimary: boolean) => {
        const listingId = uuidv7(ctx.now.getTime() - 500_000 + out.listings.length);
        const agency = isPrivate ? null : rng.pick(ctx.agencies);
        const sourceId = isPrivate ? ctx.privateSourceId : pubSrc[idx % pubSrc.length]!;
        const pubShift = idx === 0 ? 0 : rng.int(-20, 25) * DAY;
        const pub = new Date(Math.min(ctx.now.getTime() - DAY, publishedAt.getTime() + pubShift));
        const noise = idx === 0 ? 1 : 1 + rng.between(-0.03, 0.03);
        const finalPrice = business === "sale" ? round(price0 * noise, 500) : round(price0 * noise, 10);

        // price changes
        let initial = finalPrice;
        const ageDays = Math.max(1, Math.floor((ctx.now.getTime() - pub.getTime()) / DAY));
        const steps: { at: Date; price: number }[] = [];
        if (ageDays > 20 && rng.chance(0.32)) {
          const n = rng.weighted([[1, 70], [2, 25], [3, 5]] as [number, number][]);
          let p = finalPrice;
          const back: number[] = [];
          for (let k = 0; k < n; k++) {
            const d = rng.between(0.02, 0.1);
            p = business === "sale" ? round(p / (1 - d), 500) : round(p / (1 - d), 10);
            back.push(p);
          }
          initial = back[back.length - 1]!;
          const prices = [...back.slice().reverse(), finalPrice]; // initial → ... → final
          const times = Array.from({ length: n }, () => pub.getTime() + rng.between(7, Math.max(8, ageDays - 1)) * DAY).sort((a, b) => a - b);
          steps.push({ at: pub, price: prices[0]! });
          for (let k = 0; k < n; k++) steps.push({ at: new Date(times[k]!), price: prices[k + 1]! });
        } else {
          steps.push({ at: pub, price: finalPrice });
        }
        const dropPct = initial > finalPrice ? Math.round(((initial - finalPrice) / initial) * 10000) / 100 : 0;
        const lastChange = steps.length > 1 ? steps[steps.length - 1]!.at : null;
        const lStatus = idx === 0 ? status : rng.chance(0.9) ? status : "withdrawn";
        const endedAt = lStatus !== "active" && lStatus !== "pending_review" ? new Date(pub.getTime() + rng.between(5, Math.max(6, ageDays)) * DAY) : null;
        const verified = agency?.verified ?? false;
        const cheap = business === "rent";
        const featuredNow = isPrimary && !isPrivate && lStatus === "active" && type === "apartment" && pm2 > 2500 && rng.chance(0.02);

        const title = (() => {
          const typ = typology != null && residential ? ` T${typology}` : "";
          const tail =
            pool && type === "house" ? " com piscina"
            : view === "mar" ? " com vista mar"
            : terrace ? " com terraço"
            : balcony ? " com varanda"
            : condition === "new" ? " novo"
            : condition === "to_renovate" ? " para recuperar"
            : parking > 0 && isApt ? " com garagem"
            : "";
          return `${TYPE_LABEL[type]}${typ}${tail} em ${parish.name}`;
        })();

        out.listings.push({
          id: listingId,
          property_id: propertyId,
          source_id: sourceId,
          external_id: `${isPrivate ? "p" : "f"}-${refCounter}-${idx}`,
          business,
          price: finalPrice,
          initial_price: initial,
          price_per_m2: cheap && usable ? Math.round((finalPrice / usable) * 100) / 100 : ppm(finalPrice),
          price_drop_pct: dropPct,
          last_price_change_at: lastChange,
          status: lStatus,
          is_primary: isPrimary,
          advertiser_type: isPrivate ? "private" : "professional",
          advertiser_name: isPrivate ? "Particular" : `${agency!.name} (demo)`,
          agency_id: agency?.id ?? null,
          contact_phone: null,
          contact_email: null,
          url: null,
          title,
          description: describe(rng, { ...prop, condition }, parish),
          published_at: pub,
          first_seen_at: pub,
          last_seen_at: endedAt ?? ctx.now,
          ended_at: endedAt,
          verified,
          fraud_score: 0,
          featured: featuredNow,
          is_seed: true,
        });
        for (const s of steps) out.priceHistory.push({ listing_id: listingId, price: s.price, recorded_at: s.at });
        out.events.push({ listing_id: listingId, property_id: propertyId, type: "published", from_price: null, to_price: steps[0]!.price, occurred_at: pub, processed_at: ctx.now });
        for (let k = 1; k < steps.length; k++)
          out.events.push({ listing_id: listingId, property_id: propertyId, type: "price_drop", from_price: steps[k - 1]!.price, to_price: steps[k]!.price, occurred_at: steps[k]!.at, processed_at: ctx.now });
        if (endedAt) out.events.push({ listing_id: listingId, property_id: propertyId, type: lStatus === "sold" ? "sold" : lStatus === "rented" ? "rented" : "withdrawn", from_price: null, to_price: null, occurred_at: endedAt, processed_at: ctx.now });
        if (!isPrimary) out.events.push({ listing_id: listingId, property_id: propertyId, type: "merged", from_price: null, to_price: null, occurred_at: pub, processed_at: ctx.now });
        if (isPrimary && lStatus === "active" && ageDays > 60 && rng.chance(0.03))
          out.events.push({ listing_id: listingId, property_id: propertyId, type: "returned", from_price: null, to_price: null, occurred_at: new Date(ctx.now.getTime() - rng.int(2, 25) * DAY), processed_at: ctx.now });

        // media: duplicates share their first photos' perceptual hashes with the canonical listing
        const nMedia = mediaCount(rng, type);
        for (let n = 0; n < nMedia; n++) {
          const sharedHash = idx > 0 && n < 3;
          out.media.push({
            listing_id: listingId,
            kind: "image",
            url: `/api/img/seed/${propertyId}/${n}?k=${type === "apartment" ? 0 : type === "house" ? 1 : type === "land" ? 2 : 3}`,
            width: 1200,
            height: 800,
            phash: sharedHash ? hashString(`${propertyId}:${n}`).toString(16).padStart(8, "0").repeat(2) : hex16(rng),
            position: n,
            alt: `Imagem ilustrativa ${n + 1} de ${nMedia} — ${title}`,
            is_illustrative: true,
          });
        }
        return listingId;
      };

      buildListing(0, true);
      for (let d = 1; d <= dupCount; d++) {
        buildListing(d, false);
        out.stats.duplicates++;
      }
      if (isPrivate) out.stats.fsbo++;
    }
  }
  out.stats.properties = out.properties.length;
  out.stats.listings = out.listings.length;
  return out;
}

export { AGENCIES };
