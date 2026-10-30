"use client";

import { useTranslations } from "next-intl";
import { useId, useMemo, useState } from "react";
import { Input, Label, Select } from "@/components/ui/input";
import { mortgage, type TaxBracket } from "@/lib/calc";
import { affordability, capitalGains, principalFor, purchaseCosts, rentalReturn, rentIrsRate, type PurchaseKind } from "@/lib/calc-pt";
import { formatEur, formatEur2 } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface FiscalProps {
  euribor: { value: number; validFrom: string } | null;
  hpp: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  secondary: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  other: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  jovem: { limits: [number, number]; validFrom: string; verified: boolean } | null;
  stamp: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
  rentIrs: { brackets: TaxBracket[]; validFrom: string; verified: boolean } | null;
}

type Tab = "buy" | "gains" | "rent" | "afford";
const pct = (n: number, d = 2) => `${(n * 100).toFixed(d).replace(".", ",")} %`;

function Num({ id, label, value, onChange, step = 1, min = 0, max, hint }: { id: string; label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; hint?: string }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} max={max} step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))} aria-describedby={hint ? `${id}-h` : undefined} />
      {hint && (
        <p id={`${id}-h`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className={strong ? "font-medium" : "text-muted"}>{label}</dt>
      <dd className={cn("tnum", strong ? "text-xl font-semibold text-brand" : "font-medium")}>{value}</dd>
    </div>
  );
}

function Source({ t, d }: { t: string; d: { validFrom: string; verified: boolean } | null }) {
  const c = useTranslations("calculators");
  if (!d) return <p className="mt-2 text-xs text-warn">{c("noTable", { tax: t })}</p>;
  return (
    <p className="mt-2 text-xs text-muted">
      {c("source", { tax: t, date: d.validFrom.split("-").reverse().join("/") })} {!d.verified && <span className="text-warn">{c("unverified")}</span>}
    </p>
  );
}

const card = "rounded-[16px] border border-border bg-surface p-5";

export function PtCalculators({ fiscal }: { fiscal: FiscalProps }) {
  const t = useTranslations("calculators");
  const uid = useId();
  const [tab, setTab] = useState<Tab>("buy");
  const tabs: Tab[] = ["buy", "gains", "rent", "afford"];

  // --- Buy
  const [price, setPrice] = useState(280000);
  const [kind, setKind] = useState<PurchaseKind>("hpp");
  const [jovem, setJovem] = useState(false);
  const [down, setDown] = useState(56000);
  const [years, setYears] = useState(30);
  const [spread, setSpread] = useState(1);
  const [income, setIncome] = useState(3200);
  const [otherDebt, setOtherDebt] = useState(0);
  const euribor = fiscal.euribor?.value ?? 0;
  const tables = useMemo(
    () => ({ hpp: fiscal.hpp?.brackets ?? null, secondary: fiscal.secondary?.brackets ?? null, other: fiscal.other?.brackets ?? null, jovem: fiscal.jovem?.limits ?? null, stampPurchase: fiscal.stamp?.brackets ?? null }),
    [fiscal],
  );
  const costs = useMemo(() => purchaseCosts(price, kind, tables, jovem), [price, kind, tables, jovem]);
  const loan = Math.max(0, price - down);
  const mort = useMemo(() => mortgage({ principal: loan, annualRatePct: euribor + spread, years }), [loan, euribor, spread, years]);
  const effort = income > 0 ? (mort.monthly + otherDebt) / income : 0;
  const cashNeeded = down + costs.total;
  const imtTable = kind === "hpp" ? fiscal.hpp : kind === "secondary" ? fiscal.secondary : fiscal.other;

  // --- Capital gains
  const [sale, setSale] = useState(320000);
  const [bought, setBought] = useState(190000);
  const [coef, setCoef] = useState(1);
  const [exp, setExp] = useState(12000);
  const [marginal, setMarginal] = useState(37);
  const [resident, setResident] = useState(true);
  const [isHpp, setIsHpp] = useState(false);
  const [reinv, setReinv] = useState(100);
  const gains = useMemo(
    () => capitalGains({ salePrice: sale, purchasePrice: bought, coefficient: coef, expenses: exp, marginalRatePct: marginal, resident, hppReinvestedShare: isHpp ? reinv / 100 : null }),
    [sale, bought, coef, exp, marginal, resident, isHpp, reinv],
  );

  // --- Rental
  const [rPrice, setRPrice] = useState(250000);
  const [rent, setRent] = useState(1100);
  const [vac, setVac] = useState(1);
  const [imi, setImi] = useState(0.3);
  const [vpt, setVpt] = useState(60);
  const [condo, setCondo] = useState(600);
  const [ins, setIns] = useState(200);
  const [maint, setMaint] = useState(5);
  const [lease, setLease] = useState(3);
  const irsRate = rentIrsRate(lease, fiscal.rentIrs?.brackets ?? null);
  const rr = useMemo(() => rentalReturn({ price: rPrice, monthlyRent: rent, vacancyMonths: vac, imiPct: imi, vptShare: vpt / 100, condoYearly: condo, insuranceYearly: ins, maintenancePct: maint, irsRate }), [rPrice, rent, vac, imi, vpt, condo, ins, maint, irsRate]);

  // --- Affordability
  const [aIncome, setAIncome] = useState(3200);
  const [aDebt, setADebt] = useState(0);
  const [aRatio, setARatio] = useState(35);
  const [aYears, setAYears] = useState(30);
  const [aSpread, setASpread] = useState(1);
  const [aDown, setADown] = useState(60000);
  const aff = affordability(aIncome, aDebt, aRatio / 100);
  const maxLoan = principalFor(aff.maxMonthlyPayment, euribor + aSpread, aYears);

  return (
    <div>
      <div role="tablist" aria-label={t("title")} className="inline-flex flex-wrap gap-1 rounded-full bg-surface-2 p-1">
        {tabs.map((k) => (
          <button key={k} id={`${uid}-tab-${k}`} role="tab" type="button" aria-selected={tab === k} aria-controls={`${uid}-panel`} onClick={() => setTab(k)} className={cn("min-h-10 rounded-full px-4 text-sm font-medium", tab === k ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}>
            {t(`tab.${k}`)}
          </button>
        ))}
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${tab}`} className="mt-6">
        {tab === "buy" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={card} aria-labelledby={`${uid}-b1`}>
              <h2 id={`${uid}-b1`} className="text-base font-semibold">{t("buy.title")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Num id={`${uid}-price`} label={t("price")} value={price} onChange={setPrice} step={1000} />
                <Num id={`${uid}-down`} label={t("down")} value={down} onChange={setDown} step={1000} />
                <div className="col-span-2">
                  <Label htmlFor={`${uid}-kind`}>{t("kind")}</Label>
                  <Select id={`${uid}-kind`} value={kind} onChange={(e) => setKind(e.target.value as PurchaseKind)}>
                    <option value="hpp">{t("kindHpp")}</option>
                    <option value="secondary">{t("kindSecondary")}</option>
                    <option value="other">{t("kindOther")}</option>
                  </Select>
                </div>
                {kind === "hpp" && (
                  <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={jovem} onChange={(e) => setJovem(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                    {t("jovem")}
                  </label>
                )}
                <Num id={`${uid}-years`} label={t("years")} value={years} onChange={(n) => setYears(Math.min(40, Math.max(5, n)))} min={5} max={40} />
                <Num id={`${uid}-spread`} label={t("spread")} value={spread} onChange={setSpread} step={0.05} />
                <Num id={`${uid}-income`} label={t("income")} value={income} onChange={setIncome} step={50} />
                <Num id={`${uid}-debt`} label={t("otherDebt")} value={otherDebt} onChange={setOtherDebt} step={25} />
              </div>
            </section>
            <section className={card} aria-live="polite">
              <dl className="divide-y divide-border text-sm">
                <Row label={t("imt")} value={imtTable ? formatEur2(costs.imt) : "—"} />
                <Row label={t("stamp")} value={fiscal.stamp ? formatEur2(costs.stamp) : "—"} />
                <Row label={t("taxesTotal")} value={formatEur2(costs.total)} />
                <Row label={t("cashNeeded")} value={formatEur(cashNeeded)} strong />
                <Row label={t("loan")} value={formatEur(loan)} />
                <Row label={t("euribor")} value={fiscal.euribor ? `${euribor.toFixed(3).replace(".", ",")} %` : "—"} />
                <Row label={t("monthly")} value={formatEur2(mort.monthly)} strong />
                <Row label={t("totalInterest")} value={formatEur(mort.totalInterest)} />
                <Row label={t("effort")} value={income > 0 ? pct(effort, 1) : "—"} />
              </dl>
              {effort > 0.5 && <p role="alert" className="mt-3 rounded-[10px] bg-warn-soft p-3 text-sm text-warn">{t("effortHigh")}</p>}
              {jovem && costs.jovemApplied && <p className="mt-3 text-xs text-muted">{t("jovemApplied")}</p>}
              <Source t="IMT" d={imtTable} />
              {jovem && <Source t="IMT Jovem" d={fiscal.jovem} />}
              <p className="mt-2 text-xs text-muted">{t("registryNote")}</p>
            </section>
          </div>
        )}

        {tab === "gains" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={card} aria-labelledby={`${uid}-g1`}>
              <h2 id={`${uid}-g1`} className="text-base font-semibold">{t("gains.title")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Num id={`${uid}-sale`} label={t("salePrice")} value={sale} onChange={setSale} step={1000} />
                <Num id={`${uid}-bought`} label={t("purchasePrice")} value={bought} onChange={setBought} step={1000} />
                <Num id={`${uid}-coef`} label={t("coefficient")} value={coef} onChange={setCoef} step={0.01} min={1} hint={t("coefficientHint")} />
                <Num id={`${uid}-exp`} label={t("expenses")} value={exp} onChange={setExp} step={500} hint={t("expensesHint")} />
                <Num id={`${uid}-marg`} label={t("marginal")} value={marginal} onChange={(n) => setMarginal(Math.min(53, n))} step={0.5} max={53} hint={t("marginalHint")} />
                <label className="flex min-h-11 items-center gap-2 self-end text-sm">
                  <input type="checkbox" checked={resident} onChange={(e) => setResident(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                  {t("resident")}
                </label>
                <label className="col-span-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" checked={isHpp} onChange={(e) => setIsHpp(e.target.checked)} className="size-4 accent-[var(--brand)]" />
                  {t("hppSale")}
                </label>
                {isHpp && <Num id={`${uid}-reinv`} label={t("reinvested")} value={reinv} onChange={(n) => setReinv(Math.min(100, n))} max={100} hint={t("reinvestedHint")} />}
              </div>
            </section>
            <section className={card} aria-live="polite">
              <dl className="divide-y divide-border text-sm">
                <Row label={t("gain")} value={formatEur2(gains.gain)} />
                <Row label={t("exemptShare")} value={pct(gains.exemptShare, 0)} />
                <Row label={t("taxableGain")} value={formatEur2(gains.taxableGain)} />
                <Row label={t("gainsTax")} value={formatEur2(gains.tax)} strong />
                <Row label={t("netProceeds")} value={formatEur(gains.netProceeds)} />
              </dl>
              <p className="mt-3 text-xs text-muted">{t("gainsNote")}</p>
            </section>
          </div>
        )}

        {tab === "rent" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={card} aria-labelledby={`${uid}-r1`}>
              <h2 id={`${uid}-r1`} className="text-base font-semibold">{t("rent.title")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Num id={`${uid}-rprice`} label={t("price")} value={rPrice} onChange={setRPrice} step={1000} />
                <Num id={`${uid}-rent`} label={t("monthlyRent")} value={rent} onChange={setRent} step={25} />
                <Num id={`${uid}-vac`} label={t("vacancy")} value={vac} onChange={(n) => setVac(Math.min(12, n))} step={0.5} max={12} />
                <Num id={`${uid}-lease`} label={t("lease")} value={lease} onChange={setLease} step={1} />
                <Num id={`${uid}-imi`} label={t("imiRate")} value={imi} onChange={setImi} step={0.05} hint={t("imiHint")} />
                <Num id={`${uid}-vpt`} label={t("vpt")} value={vpt} onChange={setVpt} step={5} hint={t("vptHint")} />
                <Num id={`${uid}-condo`} label={t("condo")} value={condo} onChange={setCondo} step={50} />
                <Num id={`${uid}-ins`} label={t("insurance")} value={ins} onChange={setIns} step={25} />
                <Num id={`${uid}-maint`} label={t("maintenance")} value={maint} onChange={setMaint} step={0.5} />
              </div>
            </section>
            <section className={card} aria-live="polite">
              <dl className="divide-y divide-border text-sm">
                <Row label={t("grossYearly")} value={formatEur(rr.grossYearly)} />
                <Row label={t("imiYearly")} value={formatEur(rr.imi)} />
                <Row label={t("costsYearly")} value={formatEur(rr.expenses)} />
                <Row label={`${t("irsYearly")} (${pct(irsRate, 0)})`} value={formatEur(rr.irs)} />
                <Row label={t("netYearly")} value={formatEur(rr.netYearly)} strong />
                <Row label={t("grossYield")} value={pct(rr.grossYield)} />
                <Row label={t("netYield")} value={pct(rr.netYield)} strong />
              </dl>
              <Source t="IRS (rendas)" d={fiscal.rentIrs} />
              <p className="mt-2 text-xs text-muted">{t("rentNote")}</p>
            </section>
          </div>
        )}

        {tab === "afford" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className={card} aria-labelledby={`${uid}-a1`}>
              <h2 id={`${uid}-a1`} className="text-base font-semibold">{t("afford.title")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Num id={`${uid}-ai`} label={t("income")} value={aIncome} onChange={setAIncome} step={50} />
                <Num id={`${uid}-ad`} label={t("otherDebt")} value={aDebt} onChange={setADebt} step={25} />
                <Num id={`${uid}-ar`} label={t("maxRatio")} value={aRatio} onChange={(n) => setARatio(Math.min(60, n))} max={60} hint={t("maxRatioHint")} />
                <Num id={`${uid}-ay`} label={t("years")} value={aYears} onChange={(n) => setAYears(Math.min(40, Math.max(5, n)))} min={5} max={40} />
                <Num id={`${uid}-as`} label={t("spread")} value={aSpread} onChange={setASpread} step={0.05} />
                <Num id={`${uid}-adown`} label={t("down")} value={aDown} onChange={setADown} step={1000} />
              </div>
            </section>
            <section className={card} aria-live="polite">
              <dl className="divide-y divide-border text-sm">
                <Row label={t("maxMonthly")} value={formatEur2(aff.maxMonthlyPayment)} />
                <Row label={t("maxLoan")} value={formatEur(maxLoan)} />
                <Row label={t("maxPrice")} value={formatEur(maxLoan + aDown)} strong />
              </dl>
              <p className="mt-3 text-xs text-muted">{t("affordNote")}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
