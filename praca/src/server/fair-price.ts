import { classifyFairPrice, type FairPrice } from "@/lib/fair-price";
import { runValuation } from "./avm";
import type { getPropertyByReference } from "./properties";

type Property = NonNullable<Awaited<ReturnType<typeof getPropertyByReference>>>;

const cache = new Map<string, { at: number; value: FairPrice | null }>();
const TTL = 60 * 60 * 1000;

/** Fair-price verdict for an advert: the AVM run against its neighbours, leaving the advert itself out. */
export async function getFairPrice(p: Property): Promise<FairPrice | null> {
  const l = p.primary;
  if (l.status !== "active" || !p.usableArea || p.type === "land") return null;
  const key = `${l.id}:${l.price}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value;
  const business = l.business;
  const out = await runValuation(
    { lat: p.lat, lng: p.lng, type: p.type as "apartment", typology: p.typology ?? undefined, area: p.usableArea, yearBuilt: p.yearBuilt ?? undefined, condition: (p.condition as "used" | null) ?? undefined, floor: p.floor ?? undefined, elevator: p.elevator },
    { excludeListingId: l.id, only: business },
  );
  const value = classifyFairPrice(l.price, business === "sale" ? out.sale : out.rent);
  if (cache.size > 2000) cache.clear();
  cache.set(key, { at: Date.now(), value });
  return value;
}
