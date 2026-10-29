import { notFound } from "next/navigation";
import { cache } from "react";
import { parseFilters, SLUG_TYPE, type SearchFilters } from "@/lib/filters";
import type { GeoSlugs } from "@/lib/search-url";
import { resolveGeoPath, type ResolvedGeo } from "./geo";
import { listAgencies, searchListings, searchMapPoints, type MapPoint, type SearchResult } from "./search";

export interface SearchPageData {
  business: "sale" | "rent";
  filters: SearchFilters;
  geo: ResolvedGeo;
  geoSlugs: GeoSlugs;
  initial: SearchResult;
  initialMap: { points: MapPoint[]; total: number; truncated: boolean };
  agencies: { id: string; name: string }[];
}

/** Resolves path segments (optional type, then district/municipality/parish) and runs the first query on the server. */
export function loadSearchPage(
  business: "sale" | "rent",
  slug: string[] | undefined,
  searchParams: Record<string, string | string[] | undefined>,
): Promise<SearchPageData> {
  // React cache() dedupes generateMetadata + page within one request; keys must be primitives.
  return load(business, JSON.stringify(slug ?? []), JSON.stringify(searchParams));
}

const load = cache(async (business: "sale" | "rent", slugKey: string, spKey: string): Promise<SearchPageData> => {
  const slug = JSON.parse(slugKey) as string[];
  const searchParams = JSON.parse(spKey) as Record<string, string | string[] | undefined>;
  const segs = [...slug];
  let pathType: SearchFilters["types"][number] | undefined;
  if (segs[0] && SLUG_TYPE[segs[0]]) pathType = SLUG_TYPE[segs.shift()!];
  if (segs.length > 3) notFound();

  const geo = await resolveGeoPath(segs);
  if (!geo) notFound();

  const filters = parseFilters(business, searchParams);
  if (pathType && !filters.types.length) filters.types = [pathType];
  filters.districtCode = geo.district?.code;
  filters.municipalityCode = geo.municipality?.code;
  filters.parishCode = geo.parish?.code;

  const [initial, initialMap, agencies] = await Promise.all([searchListings(filters), searchMapPoints(filters), listAgencies()]);
  return {
    business,
    filters,
    geo,
    geoSlugs: { district: geo.district?.slug, municipality: geo.municipality?.slug, parish: geo.parish?.slug },
    initial,
    initialMap,
    agencies,
  };
});
