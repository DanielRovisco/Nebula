"use client";

import { Building2, Landmark, Loader2, MapPin, Search as SearchIcon, Hash, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useRouter } from "@/i18n/navigation";
import { PROPERTY_TYPES, TYPE_SLUG } from "@/lib/filters";
import { formatEur } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Suggestion, SuggestKind } from "@/server/geo";

const BUDGETS = {
  sale: [100_000, 150_000, 200_000, 300_000, 500_000, 750_000, 1_000_000, 2_000_000],
  rent: [500, 750, 1000, 1500, 2000, 3000],
} as const;

const kindIcon: Record<SuggestKind, typeof MapPin> = {
  district: Landmark,
  municipality: Building2,
  parish: MapPin,
  postcode: Mail,
  reference: Hash,
  address: MapPin,
};

export function HeroSearch() {
  const t = useTranslations("home");
  const tt = useTranslations("types");
  const tn = useTranslations("nav");
  const router = useRouter();
  const listId = useId();
  const [business, setBusiness] = useState<"sale" | "rent">("sale");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [chosen, setChosen] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chosen && chosen.label === query) return;
    if (query.trim().length < 2) {
      setItems([]);
      setSearched(false);
      return;
    }
    const id = setTimeout(async () => {
      abort.current?.abort();
      const ctl = new AbortController();
      abort.current = ctl;
      setLoading(true);
      try {
        const res = await fetch(`/api/geo/suggest?q=${encodeURIComponent(query)}`, { signal: ctl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { items: Suggestion[] };
        setItems(data.items);
        setSearched(true);
        setActive(-1);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setItems([]);
          setSearched(true);
        }
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => clearTimeout(id);
  }, [query, chosen]);

  function go(target: Suggestion | null) {
    if (target?.href) {
      router.push(target.href);
      return;
    }
    const base = business === "sale" ? "/comprar" : "/arrendar";
    const segs: string[] = [];
    if (type) segs.push(TYPE_SLUG[type as keyof typeof TYPE_SLUG]);
    if (target?.path) segs.push(...target.path);
    const qs = new URLSearchParams();
    if (budget) qs.set("pmax", budget);
    if (!target && query.trim()) qs.set("q", query.trim());
    const path = [base, ...segs].join("/");
    router.push(qs.size ? `${path}?${qs}` : path);
  }

  function choose(s: Suggestion) {
    setChosen(s);
    setQuery(s.label);
    setOpen(false);
    if (s.href) go(s);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && open && active >= 0 && items[active]) {
      e.preventDefault();
      choose(items[active]!);
    }
  }

  const showList = open && query.trim().length >= 2 && (items.length > 0 || searched);

  return (
    <form
      role="search"
      aria-label={t("searchLabel")}
      onSubmit={(e) => {
        e.preventDefault();
        go(chosen && chosen.label === query ? chosen : items[0] && !chosen ? items[0] : chosen);
      }}
      className="relative z-10 rounded-[20px] border border-border bg-surface p-3 shadow-[var(--shadow-lg)] sm:p-4"
    >
      <div role="radiogroup" aria-label={t("searchLabel")} className="mb-3 inline-flex rounded-full bg-surface-2 p-1">
        {(["sale", "rent"] as const).map((b) => (
          <button
            key={b}
            type="button"
            role="radio"
            aria-checked={business === b}
            onClick={() => {
              setBusiness(b);
              setBudget("");
            }}
            className={cn(
              "min-h-10 rounded-full px-5 text-sm font-medium transition-colors",
              business === b ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {b === "sale" ? tn("buy") : tn("rent")}
          </button>
        ))}
      </div>

      <div className="relative">
        <label htmlFor="hero-q" className="sr-only">
          {t("searchLabel")}
        </label>
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          id="hero-q"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={t("searchPlaceholder")}
          onChange={(e) => {
            setQuery(e.target.value);
            setChosen(null);
          }}
          onFocus={() => items.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className="h-14 w-full rounded-[14px] border border-border-strong bg-bg pl-12 pr-12 text-base placeholder:text-muted/80 hover:border-fg/40 focus-visible:border-brand"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 size-5 -translate-y-1/2 animate-spin text-muted" aria-hidden />}
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={t("suggestionsLabel")}
            className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-auto rounded-[14px] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]"
          >
            {items.length === 0 && <li className="px-3 py-3 text-sm text-muted">{t("noSuggestions")}</li>}
            {items.map((s, i) => {
              const Icon = kindIcon[s.kind];
              return (
                <li
                  key={`${s.kind}-${s.label}-${s.path?.join("/") ?? s.href}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2", i === active && "bg-brand-soft")}
                >
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.label}</span>
                    {s.sublabel && <span className="block truncate text-xs text-muted">{s.sublabel}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="mt-1.5 px-1 text-xs text-muted">{t("searchHint")}</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="hero-type" className="sr-only">
            {t("typeLabel")}
          </label>
          <Select id="hero-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{tt("all")}</option>
            {PROPERTY_TYPES.map((p) => (
              <option key={p} value={p}>
                {tt(`${p}_plural`)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="hero-budget" className="sr-only">
            {t("budgetLabel")}
          </label>
          <Select id="hero-budget" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">{t("budgetLabel")}: {t("budgetAny").toLowerCase()}</option>
            {BUDGETS[business].map((b) => (
              <option key={b} value={b}>
                {formatEur(b)}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" size="lg" className="sm:min-w-36">
          <SearchIcon aria-hidden />
          {t("searchCta")}
        </Button>
      </div>
    </form>
  );
}
