"use client";

import { List as ListIcon, Loader2, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PropertyCard } from "@/components/property-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { countActiveFilters, parseFilters, SORTS, type BBox, type SearchFilters } from "@/lib/filters";
import { formatEur } from "@/lib/format";
import { apiQuery, buildSearchHref } from "@/lib/search-url";
import { cn } from "@/lib/utils";
import type { MapPoint, ResultItem, SearchResult } from "@/server/search";
import type { SearchPageData } from "@/server/search-page";
import { FiltersPanel } from "./filters-panel";
import { SearchMap } from "./search-map";

type Status = "idle" | "loading" | "error";
interface MapData {
  points: MapPoint[];
  total: number;
  truncated: boolean;
}

function useDebounced<T extends (...a: never[]) => void>(fn: T, ms: number) {
  const ref = useRef(fn);
  ref.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    (...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => ref.current(...args), ms);
    },
    [ms],
  );
}

export function SearchWorkspace({ data }: { data: SearchPageData }) {
  const t = useTranslations("search");
  const tf = useTranslations("filters");
  const tt = useTranslations("types");
  const tc = useTranslations("conditions");
  const fmt = useFormatter();
  const router = useRouter();
  const sp = useSearchParams();

  const { business, geoSlugs, geo } = data;
  // Path-derived type stays when the query has no explicit `tipo`.
  const pathTypes = useMemo(() => (new URLSearchParams(sp.toString()).has("tipo") ? null : data.filters.types), [sp, data.filters.types]);
  const filters: SearchFilters = useMemo(() => {
    const f = parseFilters(business, sp);
    if (pathTypes) f.types = pathTypes;
    f.districtCode = data.filters.districtCode;
    f.municipalityCode = data.filters.municipalityCode;
    f.parishCode = data.filters.parishCode;
    return f;
  }, [business, sp, pathTypes, data.filters.districtCode, data.filters.municipalityCode, data.filters.parishCode]);

  const listKey = useMemo(() => `${business}|${apiQuery({ ...filters, cursor: undefined }).toString()}`, [business, filters]);
  const initialKey = useRef(`${business}|${apiQuery({ ...data.filters, cursor: undefined }).toString()}`);

  const [result, setResult] = useState<SearchResult>(data.initial);
  const [mapData, setMapData] = useState<MapData>(data.initialMap);
  const [status, setStatus] = useState<Status>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ResultItem | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [searchAsMove, setSearchAsMove] = useState(false);
  const [pendingBox, setPendingBox] = useState<BBox | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch list + map points whenever the effective query changes.
  const lastKey = useRef(initialKey.current);
  useEffect(() => {
    if (listKey === lastKey.current && retry === 0) return;
    lastKey.current = listKey;
    const ctl = new AbortController();
    const qs = apiQuery({ ...filters, cursor: undefined }).toString();
    setStatus("loading");
    Promise.all([
      fetch(`/api/search?business=${business}&${qs}`, { signal: ctl.signal }).then((r) => (r.ok ? (r.json() as Promise<SearchResult>) : Promise.reject(new Error(String(r.status))))),
      fetch(`/api/search/map?business=${business}&${qs}`, { signal: ctl.signal }).then((r) => (r.ok ? (r.json() as Promise<MapData>) : Promise.reject(new Error(String(r.status))))),
    ])
      .then(([list, pts]) => {
        setResult(list);
        setMapData(pts);
        setStatus("idle");
        listRef.current?.scrollTo({ top: 0 });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setStatus("error");
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, retry]);

  const loadMore = async () => {
    if (!result.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const qs = apiQuery({ ...filters, cursor: result.nextCursor }).toString();
      const res = await fetch(`/api/search?business=${business}&${qs}`);
      if (!res.ok) throw new Error();
      const more = (await res.json()) as SearchResult;
      setResult((r) => ({ ...more, items: [...r.items, ...more.items.filter((i) => !r.items.some((x) => x.id === i.id))] }));
    } catch {
      setStatus("error");
    } finally {
      setLoadingMore(false);
    }
  };

  /** Writes filters to the URL: query-only changes use history.replaceState (no server round trip). */
  const commit = useCallback(
    (next: SearchFilters) => {
      const href = buildSearchHref({ ...next, cursor: undefined }, geoSlugs);
      const nextPath = href.split("?")[0]!;
      const currentPath = `${business === "sale" ? "/comprar" : "/arrendar"}${[...(pathTypes?.length === 1 ? [slugOf(pathTypes[0]!)] : []), geoSlugs.district, geoSlugs.municipality, geoSlugs.parish].filter(Boolean).map((s) => "/" + s).join("")}`;
      if (nextPath === currentPath) {
        const q = href.includes("?") ? href.slice(href.indexOf("?")) : "";
        window.history.replaceState(null, "", `${window.location.pathname}${q}`);
      } else {
        router.push(href);
      }
    },
    [business, geoSlugs, pathTypes, router],
  );

  const onUserMove = useDebounced((box: BBox) => {
    if (searchAsMove) commit({ ...filters, bbox: box });
    else setPendingBox(box);
  }, 450);

  // Selected pin → card preview, and scroll the list to it when present.
  useEffect(() => {
    if (!selected) {
      setSelectedItem(null);
      return;
    }
    const inList = result.items.find((i) => i.id === selected);
    if (inList) {
      setSelectedItem(inList);
      listRef.current?.querySelector(`[data-listing-id="${selected}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const ctl = new AbortController();
    fetch(`/api/listing/${selected}/card`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((i) => i && setSelectedItem(i as ResultItem))
      .catch(() => {});
    return () => ctl.abort();
  }, [selected, result.items]);

  const place = geo.parish?.name ?? geo.municipality?.name ?? geo.district?.name ?? t("placePortugal");
  const activeCount = countActiveFilters(filters);
  const chips = describeChips(filters, { t, tf, tt, tc, fmt }, pathTypes !== null);
  const otherBusinessHref = buildSearchHref({ ...filters, business: business === "sale" ? "rent" : "sale", priceMin: undefined, priceMax: undefined, furnished: undefined, pets: undefined, occupancy: undefined, bbox: undefined }, geoSlugs);
  const nav = useTranslations("nav");
  const common = useTranslations("common");

  return (
    <div className="sticky top-16 flex h-[calc(100dvh-4rem-3.5rem-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-4rem)]">
      {/* ── toolbar ── */}
      <div className="border-b border-border bg-surface">
        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 sm:px-4 [scrollbar-width:none]">
          <div role="group" aria-label={nav("buy") + " / " + nav("rent")} className="flex shrink-0 rounded-full bg-surface-2 p-1">
            <Link href={business === "sale" ? "#" : otherBusinessHref} aria-current={business === "sale" ? "page" : undefined} className={cn("flex min-h-9 items-center rounded-full px-4 text-sm font-medium", business === "sale" ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}>
              {nav("buy")}
            </Link>
            <Link href={business === "rent" ? "#" : otherBusinessHref} aria-current={business === "rent" ? "page" : undefined} className={cn("flex min-h-9 items-center rounded-full px-4 text-sm font-medium", business === "rent" ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}>
              {nav("rent")}
            </Link>
          </div>

          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant={activeCount ? "soft" : "secondary"} size="sm" className="shrink-0">
                <SlidersHorizontal aria-hidden />
                {activeCount ? t("filtersActive", { count: activeCount }) : t("filters")}
              </Button>
            </SheetTrigger>
            <SheetContent title={tf("title")} closeLabel={common("close")}>
              {filtersOpen && <FiltersPanel value={filters} agencies={data.agencies} onApply={commit} />}
            </SheetContent>
          </Sheet>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <label htmlFor="sort" className="sr-only">
              {t("sortLabel")}
            </label>
            <div className="relative">
              <Select id="sort" className="h-9 w-auto min-w-44 text-sm" value={filters.sort} onChange={(e) => commit({ ...filters, sort: e.target.value as SearchFilters["sort"] })}>
                {SORTS.map((s) => (
                  <option key={s} value={s}>
                    {t(`sort.${s}`)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="flex gap-2 overflow-x-auto px-3 pb-2.5 sm:px-4 [scrollbar-width:none]" aria-label={t("filters")}>
            {chips.map((c) => (
              <li key={c.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => commit(c.clear(filters))}
                  aria-label={tf("removeChip", { name: c.label })}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-xs font-medium text-brand hover:opacity-80"
                >
                  {c.label}
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── split view ── */}
      <div className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(420px,560px)_1fr]">
        <section aria-label={t("results", { count: result.total })} className={cn("flex h-full min-h-0 flex-col bg-bg", view === "map" && "max-lg:hidden")}>
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold" aria-live="polite">
                {t("results", { count: result.total })} <span className="font-normal text-muted">{t("resultsFor", { place })}</span>
              </h2>
              {filters.bbox && <p className="text-xs text-muted">{t("areaActive")}</p>}
            </div>
            {status === "loading" && <Loader2 className="size-4 animate-spin text-muted" aria-label={common("loading")} />}
          </div>

          <div ref={listRef} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 pb-24 sm:p-4 lg:pb-6", status === "loading" && "opacity-60 transition-opacity")}>
            {status === "error" ? (
              <ErrorState title={t("errorTitle")} text={t("errorText")} action={<Button onClick={() => setRetry((n) => n + 1)}>{common("retry")}</Button>} />
            ) : result.items.length === 0 && status !== "loading" ? (
              <EmptyState
                title={t("emptyTitle")}
                text={t("emptyText")}
                action={
                  <Button onClick={() => commit({ business, types: [], typologies: [], conditions: [], energy: [], views: [], sort: "relevance" })}>
                    {t("emptyClear")}
                  </Button>
                }
              />
            ) : (
              <>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {result.items.map((item, i) => (
                    <li key={item.id}>
                      <PropertyCard
                        item={item}
                        highlighted={hovered === item.id || selected === item.id}
                        priority={i < 4}
                        onHover={setHovered}
                        compact
                      />
                    </li>
                  ))}
                  {status === "loading" && result.items.length === 0 && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-60" />)}
                </ul>
                {result.nextCursor ? (
                  <div className="mt-5 flex justify-center">
                    <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>
                      {loadingMore && <Loader2 className="animate-spin" aria-hidden />}
                      {loadingMore ? t("loadingMore") : t("loadMore")}
                    </Button>
                  </div>
                ) : (
                  result.items.length > 0 && <p className="mt-6 text-center text-sm text-muted">{t("endOfResults")}</p>
                )}
              </>
            )}
          </div>
        </section>

        <section className={cn("relative h-full min-h-0 overflow-hidden", view === "list" && "max-lg:hidden")} aria-label={t("map")}>
          <SearchMap
            className="absolute inset-0"
            points={mapData.points}
            business={business}
            bounds={geo.bounds}
            frameKey={`${geoSlugs.district}/${geoSlugs.municipality}/${geoSlugs.parish}`}
            hoveredId={hovered}
            selectedId={selected}
            onHover={setHovered}
            onSelect={setSelected}
            onUserMove={onUserMove}
          />

          <div className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-2 px-3">
            {pendingBox && !searchAsMove && (
              <Button
                className="pointer-events-auto shadow-[var(--shadow-md)]"
                size="sm"
                onClick={() => {
                  commit({ ...filters, bbox: pendingBox });
                  setPendingBox(null);
                }}
              >
                {t("searchThisArea")}
              </Button>
            )}
            <label className="pointer-events-auto flex min-h-9 cursor-pointer items-center gap-2 rounded-full bg-surface px-3.5 text-xs font-medium shadow-[var(--shadow-md)]">
              <input type="checkbox" checked={searchAsMove} onChange={(e) => setSearchAsMove(e.target.checked)} className="size-4 accent-[var(--brand)]" />
              {t("searchAsMove")}
            </label>
            {filters.bbox && (
              <Button className="pointer-events-auto shadow-[var(--shadow-md)]" size="sm" variant="secondary" onClick={() => commit({ ...filters, bbox: undefined })}>
                <X aria-hidden />
                {t("clearArea")}
              </Button>
            )}
          </div>

          {mapData.truncated && (
            <p className="pointer-events-none absolute bottom-24 left-3 right-16 rounded-xl bg-surface/95 px-3 py-2 text-xs shadow-[var(--shadow-md)] lg:bottom-3">
              {t("mapTruncated", { shown: fmt.number(mapData.points.length), total: fmt.number(mapData.total) })}
            </p>
          )}

          {selectedItem && (
            <div className="absolute inset-x-3 bottom-20 z-10 max-w-sm lg:bottom-4 lg:left-4 lg:right-auto">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label={common("close")}
                  className="absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-full bg-surface/95 shadow"
                >
                  <X className="size-4" aria-hidden />
                </button>
                <PropertyCard item={selectedItem} compact className="shadow-[var(--shadow-lg)]" />
              </div>
            </div>
          )}
        </section>

        {/* mobile list/map switch */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center lg:hidden">
          <Button className="pointer-events-auto rounded-full shadow-[var(--shadow-lg)]" onClick={() => setView(view === "list" ? "map" : "list")}>
            {view === "list" ? <MapIcon aria-hidden /> : <ListIcon aria-hidden />}
            {view === "list" ? t("showMap") : t("showList")}
          </Button>
        </div>
      </div>
    </div>
  );
}

const SLUGS: Record<string, string> = { apartment: "apartamento", house: "moradia", land: "terreno", shop: "loja", office: "escritorio", warehouse: "armazem", garage: "garagem", building: "predio" };
const slugOf = (t: string) => SLUGS[t]!;

interface ChipDeps {
  t: ReturnType<typeof useTranslations>;
  tf: ReturnType<typeof useTranslations>;
  tt: ReturnType<typeof useTranslations>;
  tc: ReturnType<typeof useTranslations>;
  fmt: ReturnType<typeof useFormatter>;
}

function describeChips(f: SearchFilters, d: ChipDeps, _typeInPath: boolean) {
  const { tf, tt, tc } = d;
  const chips: { id: string; label: string; clear: (f: SearchFilters) => SearchFilters }[] = [];
  const range = (min?: number, max?: number, fmtN: (n: number) => string = (n) => String(n)) =>
    min != null && max != null ? tf("summary.price", { min: fmtN(min), max: fmtN(max) }) : min != null ? tf("summary.from", { value: fmtN(min) }) : tf("summary.upTo", { value: fmtN(max!) });
  const eur = (n: number) => formatEur(n);
  if (f.types.length) chips.push({ id: "types", label: f.types.map((x) => tt(x)).join(", "), clear: (x) => ({ ...x, types: [] }) });
  if (f.typologies.length) chips.push({ id: "typ", label: f.typologies.map((n) => (n === 5 ? "T5+" : `T${n}`)).join(", "), clear: (x) => ({ ...x, typologies: [] }) });
  if (f.priceMin != null || f.priceMax != null) chips.push({ id: "price", label: range(f.priceMin, f.priceMax, eur), clear: (x) => ({ ...x, priceMin: undefined, priceMax: undefined }) });
  if (f.areaMin != null || f.areaMax != null) chips.push({ id: "area", label: range(f.areaMin, f.areaMax) + " m²", clear: (x) => ({ ...x, areaMin: undefined, areaMax: undefined }) });
  if (f.grossMin != null || f.grossMax != null) chips.push({ id: "gross", label: tf("grossArea") + " " + range(f.grossMin, f.grossMax), clear: (x) => ({ ...x, grossMin: undefined, grossMax: undefined }) });
  if (f.plotMin != null || f.plotMax != null) chips.push({ id: "plot", label: tf("plotArea") + " " + range(f.plotMin, f.plotMax), clear: (x) => ({ ...x, plotMin: undefined, plotMax: undefined }) });
  if (f.bedrooms != null) chips.push({ id: "beds", label: tf("summary.bedrooms", { n: f.bedrooms }), clear: (x) => ({ ...x, bedrooms: undefined }) });
  if (f.bathrooms != null) chips.push({ id: "baths", label: tf("summary.bathrooms", { n: f.bathrooms }), clear: (x) => ({ ...x, bathrooms: undefined }) });
  if (f.parking != null) chips.push({ id: "park", label: tf("summary.parking", { n: f.parking }), clear: (x) => ({ ...x, parking: undefined }) });
  const flags: [keyof SearchFilters, string][] = [["elevator", tf("elevator")], ["balcony", tf("balcony")], ["pool", tf("pool")], ["garden", tf("garden")], ["furnished", tf("furnished")], ["pets", tf("pets")], ["priceDrop", tf("priceDrop")]];
  for (const [k, label] of flags) if (f[k]) chips.push({ id: String(k), label, clear: (x) => ({ ...x, [k]: undefined }) });
  if (f.occupancy) chips.push({ id: "occ", label: f.occupancy === "free" ? tf("occupancyFree") : tf("occupancyTenanted"), clear: (x) => ({ ...x, occupancy: undefined }) });
  if (f.conditions.length) chips.push({ id: "cond", label: f.conditions.map((c) => tc(c)).join(", "), clear: (x) => ({ ...x, conditions: [] }) });
  if (f.energy.length) chips.push({ id: "energy", label: f.energy.map((e) => (e === "exempt" ? tf("energyExempt") : e)).join(", "), clear: (x) => ({ ...x, energy: [] }) });
  if (f.yearMin != null || f.yearMax != null) chips.push({ id: "year", label: range(f.yearMin, f.yearMax), clear: (x) => ({ ...x, yearMin: undefined, yearMax: undefined }) });
  if (f.floorMin != null || f.floorMax != null) chips.push({ id: "floor", label: tf("floor") + " " + range(f.floorMin, f.floorMax), clear: (x) => ({ ...x, floorMin: undefined, floorMax: undefined }) });
  if (f.views.length) chips.push({ id: "views", label: f.views.join(", "), clear: (x) => ({ ...x, views: [] }) });
  if (f.published) chips.push({ id: "pub", label: tf(`published${f.published}` as "published1d"), clear: (x) => ({ ...x, published: undefined }) });
  if (f.advertiser) chips.push({ id: "adv", label: f.advertiser === "private" ? tf("advertiserPrivate") : tf("advertiserProfessional"), clear: (x) => ({ ...x, advertiser: undefined }) });
  if (f.agency) chips.push({ id: "agency", label: tf("chips.agency"), clear: (x) => ({ ...x, agency: undefined }) });
  if (f.q) chips.push({ id: "q", label: `“${f.q}”`, clear: (x) => ({ ...x, q: undefined }) });
  if (f.bbox) chips.push({ id: "bbox", label: tf("chips.map"), clear: (x) => ({ ...x, bbox: undefined }) });
  return chips;
}
