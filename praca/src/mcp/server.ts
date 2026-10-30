import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mortgage } from "@/lib/calc";
import { purchaseCosts, type PurchaseTables } from "@/lib/calc-pt";
import { parseFilters } from "@/lib/filters";
import { siteUrl } from "@/lib/env";
import { runValuation } from "@/server/avm";
import { propertySummary } from "@/server/api/serialize";
import { getFairPrice } from "@/server/fair-price";
import { getFiscalTable, getRate } from "@/server/fiscal";
import { interpretQuery } from "@/server/nl-search";
import { getKpi, resolveCodes } from "@/server/observatory";
import { getPropertyByReference } from "@/server/properties";
import { riskAt } from "@/server/risk";
import { searchListings } from "@/server/search";
import { suggest } from "@/server/geo";

const text = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (message: string) => ({ isError: true, content: [{ type: "text" as const, text: message }] });

/**
 * MCP server over the same data and rules as the website and REST API. Read-only tools: nothing here writes data.
 * Prices are asking prices from listings, never transaction prices, and demo data is flagged in every payload.
 */
export function createPracaMcpServer(): McpServer {
  const server = new McpServer({ name: "praca", version: "1.0.0" });

  server.registerTool(
    "interpret_query",
    { description: "Turns a Portuguese or English sentence (e.g. 'T2 em Lisboa até 350k com varanda') into search filters and a results URL. Reports phrases it cannot filter on.", inputSchema: { text: z.string().min(3).max(240) } },
    async ({ text: t }) => {
      const r = await interpretQuery(t);
      return text({ url: siteUrl + r.href, understood: r.chips.map((c) => c.label), ignored: r.ignored, placeNotFound: r.placeNotFound });
    },
  );

  server.registerTool(
    "search_properties",
    {
      description: "Searches active listings. `place` is a district, municipality or parish name. Returns up to 20 results with price, €/m², area, location and a link.",
      inputSchema: {
        business: z.enum(["sale", "rent"]).default("sale"),
        place: z.string().max(80).optional(),
        types: z.array(z.enum(["apartment", "house", "land", "shop", "office", "warehouse", "garage", "building"])).max(8).optional(),
        typologies: z.array(z.number().int().min(0).max(5)).max(6).optional(),
        price_min: z.number().min(0).optional(),
        price_max: z.number().min(0).optional(),
        area_min: z.number().min(0).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      },
    },
    async (a) => {
      const sp = new URLSearchParams();
      if (a.types?.length) sp.set("tipo", a.types.join(","));
      if (a.typologies?.length) sp.set("t", a.typologies.join(","));
      if (a.price_min != null) sp.set("pmin", String(a.price_min));
      if (a.price_max != null) sp.set("pmax", String(a.price_max));
      if (a.area_min != null) sp.set("amin", String(a.area_min));
      const f = parseFilters(a.business, sp);
      let placeLabel: string | null = null;
      if (a.place) {
        const hit = (await suggest(a.place, 5)).find((s) => s.code && (s.kind === "district" || s.kind === "municipality" || s.kind === "parish"));
        if (!hit?.code) return fail(`Não encontrei o local "${a.place}".`);
        placeLabel = hit.label;
        if (hit.kind === "district") f.districtCode = hit.code;
        else if (hit.kind === "municipality") f.municipalityCode = hit.code;
        else f.parishCode = hit.code;
      }
      const r = await searchListings(f, a.limit);
      return text({ place: placeLabel, total: r.total, results: r.items.map((i) => ({ ...propertySummary(i), url: siteUrl + `/imovel/${i.reference.toLowerCase()}` })) });
    },
  );

  server.registerTool(
    "get_property",
    { description: "Details of one property by reference (PR-000123): specs, price, price history, fair-price verdict against similar listings and natural-hazard layers.", inputSchema: { reference: z.string().regex(/^PR-\d{6}$/i) } },
    async ({ reference }) => {
      const p = await getPropertyByReference(reference.toUpperCase());
      if (!p) return fail("Imóvel não encontrado.");
      const [fair, risks] = await Promise.all([getFairPrice(p).catch(() => null), riskAt(p.lat, p.lng).catch(() => [])]);
      const l = p.primary;
      return text({
        reference: p.reference, url: siteUrl + `/imovel/${p.reference.toLowerCase()}`, isDemo: p.isSeed, business: l.business, title: l.title, price: l.price, pricePerM2: l.pricePerM2,
        type: p.type, typology: p.typology, usableArea: p.usableArea, yearBuilt: p.yearBuilt, condition: p.condition, energyClass: p.energyClass, location: { lat: p.lat, lng: p.lng, parish: p.geo.parish?.name, municipality: p.geo.municipality?.name },
        priceHistory: p.priceHistory, fairPrice: fair, risks: risks.map((r) => ({ layer: r.name, level: r.levelLabel ?? "fora das zonas mapeadas", source: r.source, demo: r.isSeed })),
      });
    },
  );

  server.registerTool(
    "market_stats",
    { description: "Market indicators for a territory by code: PT, a 2-digit district, a 4-digit municipality or a 6-digit parish. Median €/m², interval, sample size and yield. Values are asking prices.", inputSchema: { geo_id: z.string().regex(/^(PT|\d{2}|\d{4}|\d{6})$/i), business: z.enum(["sale", "rent"]).default("sale") } },
    async ({ geo_id, business }) => {
      const [zone] = await resolveCodes([geo_id.toUpperCase()]);
      if (!zone) return fail("Território não encontrado.");
      const k = await getKpi(zone.level, zone.code, business);
      return text({ geo: { id: zone.code, level: zone.level, name: zone.name }, business, indicators: k && { medianPricePerM2: k.ppm, p25: k.p25, p75: k.p75, sample: k.n, yoyChange: k.yoy, grossYield: k.grossYield, medianDaysOnMarket: k.dom, period: k.period, aggregatedFrom: k.aggregatedFrom, isDemo: k.isSeed }, note: "Preços pedidos em anúncios, não preços de transação." });
    },
  );

  server.registerTool(
    "estimate_value",
    {
      description: "Indicative valuation (weighted median of similar listings, with interval and confidence) for a property at a location. Not a bank or expert valuation.",
      inputSchema: {
        lat: z.number().min(29).max(43), lng: z.number().min(-35).max(-5),
        type: z.enum(["apartment", "house", "shop", "office", "warehouse", "garage", "building"]),
        typology: z.number().int().min(0).max(5).optional(), area: z.number().min(10).max(5000),
        year_built: z.number().int().min(1500).max(2100).optional(), condition: z.enum(["new", "used", "to_renovate", "under_construction"]).optional(),
      },
    },
    async (a) => {
      const o = await runValuation({ lat: a.lat, lng: a.lng, type: a.type, typology: a.typology, area: a.area, yearBuilt: a.year_built, condition: a.condition });
      if (!o.sale) return fail("Sem comparáveis suficientes nesta zona.");
      return text({ sale: { value: o.sale.value, low: o.sale.low, high: o.sale.high, pricePerM2: o.sale.pricePerM2, confidence: o.sale.level, comparables: o.sale.n }, rent: o.rent && { value: o.rent.value, low: o.rent.low, high: o.rent.high }, grossYield: o.grossYield, radiusMeters: o.radiusM, method: o.method });
    },
  );

  server.registerTool(
    "purchase_costs",
    {
      description: "IMT, stamp duty and mortgage payment for a purchase in mainland Portugal, using the fiscal tables in force. Says when a table is still unconfirmed.",
      inputSchema: { price: z.number().min(1).max(50_000_000), kind: z.enum(["hpp", "secondary", "other"]).default("hpp"), jovem: z.boolean().default(false), down_payment: z.number().min(0).default(0), years: z.number().int().min(5).max(40).default(30), spread_pct: z.number().min(0).max(8).default(1) },
    },
    async (a) => {
      const [hpp, secondary, other, jovem, stamp, euribor] = await Promise.all([getFiscalTable("imt", "hpp_mainland"), getFiscalTable("imt", "secondary_mainland"), getFiscalTable("imt", "other_urban"), getFiscalTable("imt_jovem", "mainland"), getFiscalTable("stamp_duty_purchase", "all"), getRate("euribor_12m")]);
      const tables: PurchaseTables = { hpp: hpp?.brackets ?? null, secondary: secondary?.brackets ?? null, other: other?.brackets ?? null, jovem: jovem && jovem.brackets.length >= 2 ? [jovem.brackets[0]!.upTo ?? 0, jovem.brackets[1]!.upTo ?? 0] : null, stampPurchase: stamp?.brackets ?? null };
      const c = purchaseCosts(a.price, a.kind, tables, a.jovem);
      const rate = (euribor?.value ?? 0) + a.spread_pct;
      const m = mortgage({ principal: Math.max(0, a.price - a.down_payment), annualRatePct: rate, years: a.years });
      const unverified = [hpp, secondary, other, jovem, stamp].some((t) => t && !t.verified);
      return text({ imt: c.imt, stampDuty: c.stamp, totalTaxes: c.total, imtJovemApplied: c.jovemApplied, mortgage: { principal: Math.max(0, a.price - a.down_payment), monthly: m.monthly, totalInterest: m.totalInterest, annualRatePct: rate, euribor12m: euribor?.value ?? null }, tablesInForceSince: hpp?.validFrom, unconfirmedTables: unverified, note: "Estimativa. Não inclui registos, escritura nem comissões." });
    },
  );

  return server;
}
