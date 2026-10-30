import { getPropertyByReference } from "./properties";
import type { Prefill } from "@/components/valuation/valuation-form";

/** Pre-fills the valuation form from an existing property reference (PR-000123). */
export async function getComparablesPrefill(ref: string): Promise<Prefill | null> {
  if (!/^PR-\d{6}$/i.test(ref)) return null;
  const p = await getPropertyByReference(ref);
  if (!p) return null;
  return { lat: p.lat, lng: p.lng, address: p.address ?? undefined, postalCode: p.postalCode ?? undefined, type: p.type, typology: p.typology, area: p.usableArea, yearBuilt: p.yearBuilt, condition: p.condition, floor: p.floor, elevator: p.elevator, ref: p.reference };
}
