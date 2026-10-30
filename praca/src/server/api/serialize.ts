import type { ResultItem } from "@/server/search";

/** Public, stable shape of a search result. Field names are part of the API contract (see OpenAPI). */
export function propertySummary(i: ResultItem) {
  return {
    id: i.propertyId,
    reference: i.reference,
    listingId: i.id,
    business: i.business,
    type: i.type,
    typology: i.typology,
    title: i.title,
    price: i.price,
    pricePerM2: i.pricePerM2,
    priceDropPct: i.dropPct,
    usableArea: i.area,
    bedrooms: i.bedrooms,
    bathrooms: i.bathrooms,
    energyClass: i.energy,
    location: { lat: i.lat, lng: i.lng, parish: i.parish, municipality: i.municipality },
    advertiserType: i.advertiserType,
    verified: i.verified,
    publishedAt: i.publishedAt,
    listingCount: i.listingCount,
    isDemo: i.isSeed,
    url: `/imovel/${i.reference.toLowerCase()}`,
  };
}
