"use client";

import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { SheetClose } from "@/components/ui/sheet";
import {
  CONDITIONS,
  ENERGY,
  PROPERTY_TYPES,
  PUBLISHED,
  VIEWS,
  type PropertyType,
  type SearchFilters,
} from "@/lib/filters";
import { apiQuery } from "@/lib/search-url";
import { cn } from "@/lib/utils";

interface Props {
  value: SearchFilters;
  agencies: { id: string; name: string }[];
  onApply: (f: SearchFilters) => void;
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-10 rounded-full border px-4 text-sm font-medium transition-colors",
        pressed ? "border-brand bg-brand-soft text-brand" : "border-border-strong bg-surface text-fg hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}

function Group({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <fieldset className="space-y-3 border-b border-border px-5 py-5">
      <legend className="float-left mb-3 w-full text-sm font-semibold">{title}</legend>
      <div className="clear-both space-y-3">{children}</div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

function NumberPair({
  idPrefix,
  min,
  max,
  onChange,
  step,
  minLabel,
  maxLabel,
}: {
  idPrefix: string;
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
  step?: number;
  minLabel: string;
  maxLabel: string;
}) {
  const parse = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label htmlFor={`${idPrefix}-min`} className="sr-only">
          {minLabel}
        </label>
        <Input id={`${idPrefix}-min`} type="number" inputMode="numeric" min={0} step={step} placeholder={minLabel} value={min ?? ""} onChange={(e) => onChange(parse(e.target.value), max)} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-max`} className="sr-only">
          {maxLabel}
        </label>
        <Input id={`${idPrefix}-max`} type="number" inputMode="numeric" min={0} step={step} placeholder={maxLabel} value={max ?? ""} onChange={(e) => onChange(min, parse(e.target.value))} />
      </div>
    </div>
  );
}

const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const minSelect = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

export function FiltersPanel({ value, agencies, onApply }: Props) {
  const t = useTranslations("filters");
  const tt = useTranslations("types");
  const tc = useTranslations("conditions");
  const tv = useTranslations("views");
  const [draft, setDraft] = useState<SearchFilters>(value);
  const [count, setCount] = useState<number | null>(null);
  const [counting, setCounting] = useState(false);
  const set = (patch: Partial<SearchFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const rent = draft.business === "rent";
  const resid = !draft.types.length || draft.types.some((x) => x === "apartment" || x === "house");

  // Live result count for the apply button.
  const key = useMemo(() => apiQuery({ ...draft, cursor: undefined, sort: "relevance" }).toString(), [draft]);
  const first = useRef(true);
  useEffect(() => {
    const ctl = new AbortController();
    const id = setTimeout(
      async () => {
        setCounting(true);
        try {
          const res = await fetch(`/api/search?business=${draft.business}&count=1&${key}`, { signal: ctl.signal });
          if (res.ok) setCount(((await res.json()) as { total: number }).total);
        } catch {
          /* ignore: button keeps working without a count */
        } finally {
          setCounting(false);
        }
      },
      first.current ? 0 : 250,
    );
    first.current = false;
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [key, draft.business]);

  const clearAll = () =>
    setDraft((d) => ({
      business: d.business,
      types: [],
      typologies: [],
      conditions: [],
      energy: [],
      views: [],
      zones: d.zones,
      sort: d.sort,
      districtCode: d.districtCode,
      municipalityCode: d.municipalityCode,
      parishCode: d.parishCode,
    }));

  const minOptions = (label: string, v: number | undefined, on: (n?: number) => void, id: string) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <Select id={id} value={v ?? ""} onChange={(e) => on(e.target.value === "" ? undefined : Number(e.target.value))}>
        <option value="">{t("any")}</option>
        {minSelect(5).map((n) => (
          <option key={n} value={n}>
            {n}+
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Group title={t("keywords")}>
          <Input aria-label={t("keywords")} placeholder={t("keywordsPlaceholder")} value={draft.q ?? ""} onChange={(e) => set({ q: e.target.value || undefined })} maxLength={120} />
        </Group>

        <Group title={t("propertyType")}>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_TYPES.map((p: PropertyType) => (
              <Chip key={p} pressed={draft.types.includes(p)} onClick={() => set({ types: toggle(draft.types, p) })}>
                {tt(p)}
              </Chip>
            ))}
          </div>
        </Group>

        {resid && (
          <Group title={t("typology")}>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <Chip key={n} pressed={draft.typologies.includes(n)} onClick={() => set({ typologies: toggle(draft.typologies, n).sort() })}>
                  {n === 5 ? "T5+" : `T${n}`}
                </Chip>
              ))}
            </div>
          </Group>
        )}

        <Group title={rent ? t("priceRent") : t("price")}>
          <NumberPair idPrefix="price" min={draft.priceMin} max={draft.priceMax} step={rent ? 50 : 5000} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ priceMin: a, priceMax: b })} />
        </Group>

        <Group title={t("usableArea")}>
          <NumberPair idPrefix="area" min={draft.areaMin} max={draft.areaMax} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ areaMin: a, areaMax: b })} />
          <p className="pt-1 text-sm font-medium">{t("grossArea")}</p>
          <NumberPair idPrefix="gross" min={draft.grossMin} max={draft.grossMax} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ grossMin: a, grossMax: b })} />
          <p className="pt-1 text-sm font-medium">{t("plotArea")}</p>
          <NumberPair idPrefix="plot" min={draft.plotMin} max={draft.plotMax} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ plotMin: a, plotMax: b })} />
        </Group>

        <Group title={t("rooms")}>
          <div className="grid grid-cols-3 gap-3">
            {minOptions(t("bedroomsMin"), draft.bedrooms, (n) => set({ bedrooms: n }), "f-beds")}
            {minOptions(t("bathroomsMin"), draft.bathrooms, (n) => set({ bathrooms: n }), "f-baths")}
            {minOptions(t("parkingMin"), draft.parking, (n) => set({ parking: n }), "f-park")}
          </div>
        </Group>

        <Group title={t("features")}>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={!!draft.elevator} onClick={() => set({ elevator: draft.elevator ? undefined : true })}>{t("elevator")}</Chip>
            <Chip pressed={!!draft.balcony} onClick={() => set({ balcony: draft.balcony ? undefined : true })}>{t("balcony")}</Chip>
            <Chip pressed={!!draft.pool} onClick={() => set({ pool: draft.pool ? undefined : true })}>{t("pool")}</Chip>
            <Chip pressed={!!draft.garden} onClick={() => set({ garden: draft.garden ? undefined : true })}>{t("garden")}</Chip>
            {rent && <Chip pressed={!!draft.furnished} onClick={() => set({ furnished: draft.furnished ? undefined : true })}>{t("furnished")}</Chip>}
            {rent && <Chip pressed={!!draft.pets} onClick={() => set({ pets: draft.pets ? undefined : true })}>{t("pets")}</Chip>}
            <Chip pressed={!!draft.priceDrop} onClick={() => set({ priceDrop: draft.priceDrop ? undefined : true })}>{t("priceDrop")}</Chip>
          </div>
        </Group>

        {!rent && (
          <Group title={t("occupancy")}>
            <div className="flex flex-wrap gap-2">
              <Chip pressed={!draft.occupancy} onClick={() => set({ occupancy: undefined })}>{t("occupancyAny")}</Chip>
              <Chip pressed={draft.occupancy === "free"} onClick={() => set({ occupancy: "free" })}>{t("occupancyFree")}</Chip>
              <Chip pressed={draft.occupancy === "tenanted"} onClick={() => set({ occupancy: "tenanted" })}>{t("occupancyTenanted")}</Chip>
            </div>
          </Group>
        )}

        <Group title={t("condition")}>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <Chip key={c} pressed={draft.conditions.includes(c)} onClick={() => set({ conditions: toggle(draft.conditions, c) })}>
                {tc(c)}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title={t("energy")}>
          <div className="flex flex-wrap gap-2">
            {ENERGY.map((e) => (
              <Chip key={e} pressed={draft.energy.includes(e)} onClick={() => set({ energy: toggle(draft.energy, e) })}>
                {e === "exempt" ? t("energyExempt") : e}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title={t("year")}>
          <NumberPair idPrefix="year" min={draft.yearMin} max={draft.yearMax} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ yearMin: a, yearMax: b })} />
          <p className="pt-1 text-sm font-medium">{t("floor")}</p>
          <NumberPair idPrefix="floor" min={draft.floorMin} max={draft.floorMax} minLabel={t("min")} maxLabel={t("max")} onChange={(a, b) => set({ floorMin: a, floorMax: b })} />
        </Group>

        <Group title={t("view")}>
          <div className="flex flex-wrap gap-2">
            {VIEWS.map((v) => (
              <Chip key={v} pressed={draft.views.includes(v)} onClick={() => set({ views: toggle(draft.views, v) })}>
                {tv(v)}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title={t("published")}>
          <Select aria-label={t("published")} value={draft.published ?? ""} onChange={(e) => set({ published: (e.target.value || undefined) as SearchFilters["published"] })}>
            <option value="">{t("publishedAny")}</option>
            {PUBLISHED.map((p) => (
              <option key={p} value={p}>
                {t(`published${p}` as "published1d")}
              </option>
            ))}
          </Select>
        </Group>

        <Group title={t("advertiser")} hint={t("advertiserPrivateHint")}>
          <div className="flex flex-wrap gap-2">
            <Chip pressed={!draft.advertiser} onClick={() => set({ advertiser: undefined })}>{t("advertiserAny")}</Chip>
            <Chip pressed={draft.advertiser === "private"} onClick={() => set({ advertiser: "private" })}>{t("advertiserPrivate")}</Chip>
            <Chip pressed={draft.advertiser === "professional"} onClick={() => set({ advertiser: "professional" })}>{t("advertiserProfessional")}</Chip>
          </div>
          {agencies.length > 0 && (
            <Select aria-label={t("advertiser")} value={draft.agency ?? ""} onChange={(e) => set({ agency: e.target.value || undefined })}>
              <option value="">{t("advertiserAny")}</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Group>
      </div>

      <div className="flex items-center gap-3 border-t border-border bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button variant="ghost" onClick={clearAll}>
          {t("clearAll")}
        </Button>
        <SheetClose asChild>
          <Button className="flex-1" onClick={() => onApply(draft)}>
            {counting && <Loader2 className="animate-spin" aria-hidden />}
            {t("apply", { count: count ?? 0 })}
          </Button>
        </SheetClose>
      </div>
    </div>
  );
}
