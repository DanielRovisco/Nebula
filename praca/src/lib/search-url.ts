import { filtersToParams, TYPE_SLUG, type SearchFilters } from "./filters";

export interface GeoSlugs {
  district?: string;
  municipality?: string;
  parish?: string;
}

/**
 * Builds the shareable search URL. A single property type and the geography go into the path
 * (/comprar/apartamento/lisboa/sintra, good for SEO); every other filter stays in the query string.
 */
export function buildSearchHref(f: SearchFilters, geo: GeoSlugs = {}): string {
  const base = f.business === "sale" ? "/comprar" : "/arrendar";
  const segs: string[] = [];
  const params = filtersToParams(f);
  if (f.types.length === 1) {
    segs.push(TYPE_SLUG[f.types[0]!]);
    params.delete("tipo");
  }
  if (geo.district) {
    segs.push(geo.district);
    if (geo.municipality) {
      segs.push(geo.municipality);
      if (geo.parish) segs.push(geo.parish);
    }
  }
  const qs = params.toString();
  return `${[base, ...segs].join("/")}${qs ? `?${qs}` : ""}`;
}

/** Query string for the JSON API: filters + resolved geography codes. */
export function apiQuery(f: SearchFilters, opts: { includeBBox?: boolean } = {}): URLSearchParams {
  const p = filtersToParams(f, { includeGeo: true, includeBBox: opts.includeBBox });
  return p;
}
