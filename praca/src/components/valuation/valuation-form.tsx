"use client";

import { Calculator, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { createValuation, type ValuationState } from "@/server/valuations";
import type { Suggestion } from "@/server/geo";
import { LocationPicker } from "./location-picker";

export interface Prefill {
  lat?: number;
  lng?: number;
  address?: string;
  postalCode?: string;
  type?: string;
  typology?: number | null;
  area?: number | null;
  yearBuilt?: number | null;
  condition?: string | null;
  floor?: number | null;
  elevator?: boolean;
  ref?: string;
}

const TYPES = ["apartment", "house", "shop", "office", "warehouse", "garage", "building"] as const;

export function ValuationForm({ prefill }: { prefill: Prefill }) {
  const t = useTranslations("valuation");
  const tt = useTranslations("types");
  const tc = useTranslations("conditions");
  const [state, action, pending] = useActionState<ValuationState, FormData>(createValuation, {});
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [point, setPoint] = useState<{ lat: number | null; lng: number | null }>({ lat: prefill.lat ?? null, lng: prefill.lng ?? null });
  const [focus, setFocus] = useState<[number, number] | null>(null);
  const [type, setType] = useState(prefill.type ?? "apartment");
  const [postal, setPostal] = useState(prefill.postalCode ?? "");

  useEffect(() => {
    if (q.trim().length < 2) return setItems([]);
    const ctl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const r = await fetch(`/api/geo/suggest?q=${encodeURIComponent(q)}`, { signal: ctl.signal });
        setItems(((await r.json()) as { items: Suggestion[] }).items.filter((i) => i.lat != null));
      } catch {
        /* aborted */
      }
    }, 160);
    return () => {
      clearTimeout(id);
      ctl.abort();
    };
  }, [q]);

  const residential = type === "apartment" || type === "house";
  const err =
    state.error === "auth" ? (
      <>
        {t("errorAuth")} <Link href="/entrar" className="font-medium underline">{t("signIn")}</Link>
      </>
    ) : state.error === "plan" ? (
      <>
        {t("errorPlan")} <Link href="/planos" className="font-medium underline">{t("upgrade")}</Link>
      </>
    ) : state.error === "quota" ? (
      <>
        {t("errorQuota", { limit: state.limit ?? 0 })} <Link href="/planos" className="font-medium underline">{t("upgrade")}</Link>
      </>
    ) : state.error === "none" ? (
      t("errorNone")
    ) : state.error === "invalid" ? (
      t("errorInvalid")
    ) : null;

  return (
    <form action={action} className="mt-8 grid gap-10 lg:grid-cols-2">
      <input type="hidden" name="lat" value={point.lat ?? ""} />
      <input type="hidden" name="lng" value={point.lng ?? ""} />
      <section className="space-y-4" aria-labelledby="loc">
        <h2 id="loc" className="text-lg font-semibold">{t("location")}</h2>
        <p className="text-sm text-muted">{t("locationHint")}</p>
        <div className="relative">
          <Label htmlFor="v-q" className="sr-only">{t("location")}</Label>
          <Input id="v-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("locationPlaceholder")} autoComplete="off" />
          {items.length > 0 && (
            <ul className="absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-[14px] border border-border bg-surface p-1.5 shadow-[var(--shadow-lg)]">
              {items.map((s) => (
                <li key={`${s.kind}-${s.code ?? s.label}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm hover:bg-brand-soft"
                    onClick={() => {
                      setQ(s.label);
                      setItems([]);
                      setFocus([s.lng!, s.lat!]);
                      if (s.kind === "postcode") setPostal(s.label);
                    }}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-muted">{s.sublabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <LocationPicker lat={point.lat} lng={point.lng} focus={focus ?? (prefill.lat != null ? null : null)} onChange={(lat, lng) => setPoint({ lat, lng })} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="v-addr">{t("address")}</Label>
            <Input id="v-addr" name="address" defaultValue={prefill.address ?? ""} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="v-pc">{t("postalCode")}</Label>
            <Input id="v-pc" name="postalCode" value={postal} onChange={(e) => setPostal(e.target.value)} maxLength={10} inputMode="numeric" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="v-cad">{t("cadastral")}</Label>
            <Input id="v-cad" name="cadastralRef" maxLength={40} />
          </div>
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="sub">
        <h2 id="sub" className="text-lg font-semibold">{t("subject")}</h2>
        {prefill.ref && <p className="rounded-[12px] bg-brand-soft p-3 text-sm text-brand">{t("prefilled", { ref: prefill.ref })}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="v-type">{t("type")}</Label>
            <Select id="v-type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((x) => <option key={x} value={x}>{tt(x)}</option>)}
            </Select>
          </div>
          {residential && (
            <div>
              <Label htmlFor="v-typ">{t("typology")}</Label>
              <Select id="v-typ" name="typology" defaultValue={prefill.typology ?? 2}>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 5 ? "T5+" : `T${n}`}</option>)}
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="v-area">{t("area")}</Label>
            <Input id="v-area" name="area" type="number" inputMode="decimal" min={10} max={5000} step="0.5" required defaultValue={prefill.area ?? ""} />
          </div>
          <div>
            <Label htmlFor="v-year">{t("year")}</Label>
            <Input id="v-year" name="yearBuilt" type="number" inputMode="numeric" min={1500} max={2100} defaultValue={prefill.yearBuilt ?? ""} />
          </div>
          <div>
            <Label htmlFor="v-cond">{t("condition")}</Label>
            <Select id="v-cond" name="condition" defaultValue={prefill.condition ?? ""}>
              <option value="">{t("conditionAny")}</option>
              {(["new", "used", "to_renovate", "under_construction"] as const).map((c) => <option key={c} value={c}>{tc(c)}</option>)}
            </Select>
          </div>
          {type === "apartment" && (
            <div>
              <Label htmlFor="v-floor">{t("floor")}</Label>
              <Input id="v-floor" name="floor" type="number" inputMode="numeric" min={-3} max={60} defaultValue={prefill.floor ?? ""} />
            </div>
          )}
        </div>
        {type === "apartment" && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name="elevator" defaultChecked={prefill.elevator} className="size-5 accent-[var(--brand)]" />
            {t("elevator")}
          </label>
        )}
        {err && <p role="alert" className="rounded-[12px] bg-down/10 p-3 text-sm text-down">{err}</p>}
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Calculator aria-hidden />}
          {pending ? t("computing") : t("submit")}
        </Button>
      </section>
    </form>
  );
}
