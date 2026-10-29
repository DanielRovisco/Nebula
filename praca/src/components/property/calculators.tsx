"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Input, Label } from "@/components/ui/input";
import { mortgage, taxFromBrackets, type TaxBracket } from "@/lib/calc";
import { formatEur, formatEur2 } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CalcTables {
  euribor: { value: number; validFrom: string } | null;
  imtHpp: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  imtOther: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  stamp: { brackets: TaxBracket[]; validFrom: string } | null;
}

export function Calculators({ price, tables }: { price: number; tables: CalcTables }) {
  const t = useTranslations("property");
  const [down, setDown] = useState(Math.round(price * 0.2));
  const [years, setYears] = useState(30);
  const [spread, setSpread] = useState(1.0);
  const [hpp, setHpp] = useState(true);

  const euribor = tables.euribor?.value ?? 0;
  const principal = Math.max(0, price - down);
  const m = useMemo(() => mortgage({ principal, annualRatePct: euribor + spread, years }), [principal, euribor, spread, years]);

  const imtTable = hpp ? tables.imtHpp : tables.imtOther;
  const imt = imtTable ? taxFromBrackets(price, imtTable.brackets) : 0;
  const stamp = tables.stamp ? taxFromBrackets(price, tables.stamp.brackets) : 0;

  const row = "flex items-baseline justify-between gap-4 py-2";
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="mortgage-title" className="rounded-[16px] border border-border bg-surface p-5">
        <h3 id="mortgage-title" className="text-base font-semibold">
          {t("mortgage")}
        </h3>
        <p className="mt-1 text-xs text-muted">{t("mortgageHint")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="down">
              {t("downPayment")} ({formatEur(down)})
            </Label>
            <input
              id="down"
              type="range"
              min={0}
              max={Math.round(price * 0.9)}
              step={1000}
              value={down}
              onChange={(e) => setDown(Number(e.target.value))}
              className="h-11 w-full accent-[var(--brand)]"
            />
          </div>
          <div>
            <Label htmlFor="years">{t("termYears")}</Label>
            <Input id="years" type="number" inputMode="numeric" min={5} max={40} value={years} onChange={(e) => setYears(Math.min(40, Math.max(5, Number(e.target.value) || 30)))} />
          </div>
          <div>
            <Label htmlFor="spread">{t("spread")}</Label>
            <Input id="spread" type="number" inputMode="decimal" min={0} max={6} step={0.05} value={spread} onChange={(e) => setSpread(Math.max(0, Number(e.target.value) || 0))} />
          </div>
        </div>
        <dl className="mt-4 divide-y divide-border text-sm">
          <div className={row}>
            <dt className="text-muted">{t("loanAmount")}</dt>
            <dd className="tnum font-medium">{formatEur(principal)}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t("euribor")}</dt>
            <dd className="tnum font-medium">{tables.euribor ? `${euribor.toFixed(3).replace(".", ",")} %` : "—"}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t("rateTotal")}</dt>
            <dd className="tnum font-medium">{(euribor + spread).toFixed(3).replace(".", ",")} %</dd>
          </div>
          <div className={row}>
            <dt className="font-medium">{t("monthlyPayment")}</dt>
            <dd className="tnum text-xl font-semibold text-brand">{formatEur2(m.monthly)}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t("totalInterest")}</dt>
            <dd className="tnum font-medium">{formatEur(m.totalInterest)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="costs-title" className="rounded-[16px] border border-border bg-surface p-5">
        <h3 id="costs-title" className="text-base font-semibold">
          {t("costs")}
        </h3>
        <p className="mt-1 text-xs text-muted">{t("costsHint")}</p>
        <div role="radiogroup" aria-label={t("costs")} className="mt-4 inline-flex rounded-full bg-surface-2 p-1">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              type="button"
              role="radio"
              aria-checked={hpp === v}
              onClick={() => setHpp(v)}
              className={cn("min-h-10 rounded-full px-4 text-sm font-medium", hpp === v ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}
            >
              {v ? t("costsHpp") : t("costsOther")}
            </button>
          ))}
        </div>
        <dl className="mt-4 divide-y divide-border text-sm">
          <div className={row}>
            <dt className="text-muted">{t("imt")}</dt>
            <dd className="tnum font-medium">{imtTable ? formatEur2(imt) : "—"}</dd>
          </div>
          <div className={row}>
            <dt className="text-muted">{t("stamp")}</dt>
            <dd className="tnum font-medium">{tables.stamp ? formatEur2(stamp) : "—"}</dd>
          </div>
          <div className={row}>
            <dt className="font-medium">{t("costsTotal")}</dt>
            <dd className="tnum text-xl font-semibold text-brand">{formatEur2(imt + stamp)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">{t("costsRegistryNote")}</p>
        {imtTable && (
          <p className="mt-1 text-xs text-muted">
            {t("costsSource", { tax: "IMT", date: imtTable.validFrom.split("-").reverse().join("/") })}
            {!imtTable.verified && ` ${t("costsUnverified")}`}
          </p>
        )}
      </section>
    </div>
  );
}
