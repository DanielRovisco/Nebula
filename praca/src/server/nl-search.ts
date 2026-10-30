import { parseFilters, type SearchFilters } from "@/lib/filters";
import { parseNaturalQuery, type NlChip } from "@/lib/nl-search";
import { buildSearchHref } from "@/lib/search-url";
import { suggest } from "./geo";

export interface NlSearchResponse {
  href: string;
  chips: NlChip[];
  ignored: string[];
  place: { label: string; kind: string } | null;
  placeNotFound: string | null;
}

/** Interprets a free-text query: rule-based filters + geography resolved against the CAOP tables. */
export async function interpretQuery(text: string): Promise<NlSearchResponse> {
  const r = parseNaturalQuery(text.slice(0, 240));
  const base = parseFilters(r.filters.business, new URLSearchParams());
  const filters: SearchFilters = { ...base, ...r.filters } as SearchFilters;

  let geo: { district?: string; municipality?: string; parish?: string } = {};
  let place: NlSearchResponse["place"] = null;
  let placeNotFound: string | null = null;
  const chips = r.chips.filter((c) => c.key !== "place");
  if (r.place) {
    const hits = (await suggest(r.place, 5)).filter((s) => s.path && (s.kind === "district" || s.kind === "municipality" || s.kind === "parish"));
    const hit = hits[0];
    if (hit?.path) {
      geo = { district: hit.path[0], municipality: hit.path[1], parish: hit.path[2] };
      place = { label: hit.label, kind: hit.kind };
      chips.push({ key: "place", label: hit.sublabel ? `${hit.label} (${hit.sublabel})` : hit.label });
    } else {
      placeNotFound = r.place;
    }
  }
  return { href: buildSearchHref(filters, geo), chips, ignored: r.ignored, place, placeNotFound };
}
