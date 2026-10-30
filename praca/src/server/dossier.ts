import { mortgage } from "@/lib/calc";
import { purchaseCosts, type PurchaseTables } from "@/lib/calc-pt";
import { siteUrl } from "@/lib/env";
import type { DossierData } from "./pdf/dossier-pdf";
import { getFairPrice } from "./fair-price";
import { getFiscalTable, getRate } from "./fiscal";
import { getPropertyByReference, getZoneStats } from "./properties";
import { riskAt } from "./risk";

export async function buildDossier(ref: string): Promise<DossierData | null> {
  if (!/^PR-\d{6}$/i.test(ref)) return null;
  const p = await getPropertyByReference(ref.toUpperCase());
  if (!p) return null;
  const l = p.primary;
  const [fair, zone, risks, hpp, secondary, other, jovem, stamp, euribor] = await Promise.all([
    getFairPrice(p).catch(() => null),
    getZoneStats(p).catch(() => null),
    riskAt(p.lat, p.lng).catch(() => []),
    getFiscalTable("imt", "hpp_mainland"),
    getFiscalTable("imt", "secondary_mainland"),
    getFiscalTable("imt", "other_urban"),
    getFiscalTable("imt_jovem", "mainland"),
    getFiscalTable("stamp_duty_purchase", "all"),
    getRate("euribor_12m"),
  ]);
  const tables: PurchaseTables = { hpp: hpp?.brackets ?? null, secondary: secondary?.brackets ?? null, other: other?.brackets ?? null, jovem: jovem && jovem.brackets.length >= 2 ? [jovem.brackets[0]!.upTo ?? 0, jovem.brackets[1]!.upTo ?? 0] : null, stampPurchase: stamp?.brackets ?? null };
  const ratePct = (euribor?.value ?? 0) + 1;
  const loan = Math.round(l.price * 0.8);
  const m = mortgage({ principal: loan, annualRatePct: ratePct, years: 30 });
  return {
    reference: p.reference,
    title: l.title,
    business: l.business,
    price: l.price,
    pricePerM2: l.pricePerM2 ?? null,
    type: p.type,
    typology: p.typology ?? null,
    usableArea: p.usableArea ?? null,
    grossArea: p.grossArea ?? null,
    bedrooms: p.bedrooms ?? null,
    bathrooms: p.bathrooms ?? null,
    yearBuilt: p.yearBuilt ?? null,
    condition: p.condition ?? null,
    energyClass: p.energyClass ?? null,
    floor: p.floor ?? null,
    parking: p.parkingSpaces ?? null,
    place: [p.geo.parish?.name, p.geo.municipality?.name].filter(Boolean).join(", "),
    isSeed: p.isSeed,
    priceHistory: p.priceHistory,
    fair,
    zone: zone ? { pricePerM2: zone.pricePerM2 ?? null, n: zone.n ?? 0 } : null,
    risks,
    costs: tables.hpp && tables.secondary ? { hpp: purchaseCosts(l.price, "hpp", tables), secondary: purchaseCosts(l.price, "secondary", tables), monthly: m.monthly, loan, ratePct, years: 30, verified: !!(hpp?.verified && secondary?.verified && stamp?.verified) } : null,
    generatedAt: new Date().toISOString(),
    url: `${siteUrl}/imovel/${p.reference.toLowerCase()}`,
  };
}
