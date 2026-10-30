import { Check } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlanCta } from "@/components/plans/plan-cta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { PLANS, TRIAL_DAYS, type Interval } from "@/lib/plans";
import { cn } from "@/lib/utils";
import { effectivePlan, getEntitlement, type Feature, type Plan } from "@/server/entitlements";
import { openBillingPortal } from "@/server/checkout";
import { currentUser } from "@/server/session";
import { mockBilling } from "@/server/stripe";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Planos" };

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ i?: string; cancelado?: string }> };

export default async function PlansPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("plans");
  const sp = await searchParams;
  const interval: Interval = sp.i === "year" ? "year" : "month";
  const user = await currentUser();
  const current = user ? await effectivePlan(user.id) : null;

  // Limits come from the entitlements table, never from the page.
  const features: [string, Feature][] = [["rowAlerts", "alerts"], ["rowValuations", "valuations"], ["rowPdf", "pdf_reports"], ["rowExports", "exports"], ["rowApi", "api_calls"]];
  const plans: Plan[] = ["free", "pro", "agency"];
  const ents = Object.fromEntries(await Promise.all(plans.flatMap((p) => features.map(async ([, f]) => [`${p}:${f}`, await getEntitlement(p, f)] as const)))) as Record<string, { enabled: boolean; limit: number | null }>;
  const crm = Object.fromEntries(await Promise.all(plans.map(async (p) => [p, await getEntitlement(p, "crm")] as const)));
  const fsbo = Object.fromEntries(await Promise.all(plans.map(async (p) => [p, await getEntitlement(p, "fsbo")] as const)));
  const cell = (e: { enabled: boolean; limit: number | null }) => (!e.enabled || e.limit === 0 ? t("none") : e.limit == null ? t("unlimited") : new Intl.NumberFormat("pt-PT").format(e.limit));

  const link = (i: Interval) => (i === "year" ? "/planos?i=year" : "/planos");
  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">
      <h1 className="font-display text-4xl font-medium sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{t("sub")}</p>
      {sp.cancelado && <p role="status" className="mt-5 rounded-[12px] bg-warn-soft p-3 text-sm text-warn">{t("canceled")}</p>}
      {mockBilling() && <p role="note" className="mt-5 rounded-[12px] bg-warn-soft p-3 text-sm text-warn">{t("mock")}</p>}

      <div role="group" aria-label={t("title")} className="mt-8 inline-flex rounded-full bg-surface-2 p-1">
        {(["month", "year"] as const).map((i) => (
          <Link key={i} href={link(i)} aria-current={interval === i ? "true" : undefined} className={cn("flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-medium", interval === i ? "bg-surface shadow-sm" : "text-muted hover:text-fg")}>
            {i === "month" ? t("monthly") : t("yearly")}
            {i === "year" && <Badge tone="up">{t("yearlySave")}</Badge>}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {(["free", "pro", "agency"] as const).map((p) => {
          const price = PLANS[p].price[interval];
          const feats = t.raw(`${p}.features`) as string[];
          const isCurrent = current?.plan === p;
          return (
            <section key={p} aria-labelledby={`plan-${p}`} className={cn("flex flex-col rounded-[24px] border bg-surface p-7", p === "pro" ? "border-brand shadow-[var(--shadow-md)]" : "border-border")}>
              <div className="flex items-start justify-between gap-2">
                <h2 id={`plan-${p}`} className="font-display text-3xl font-medium">{t(`${p}.name`)}</h2>
                {p === "pro" && <Badge tone="brand">{t("popular")}</Badge>}
                {isCurrent && <Badge tone="up">{t("current")}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted">{t(`${p}.desc`)}</p>
              <p className="tnum mt-6 flex items-baseline gap-1.5">
                <span className="font-display text-5xl font-medium">{price === 0 ? "0 €" : formatEur(price)}</span>
                {price > 0 && <span className="text-sm text-muted">{PLANS[p].perSeat ? (interval === "month" ? t("perSeatMonth") : t("perSeatYear")) : interval === "month" ? t("perMonth") : t("perYear")}</span>}
              </p>
              {price > 0 && <p className="text-xs text-muted">{t("vat")} · {t("trial", { days: TRIAL_DAYS })}</p>}
              <ul className="my-6 flex-1 space-y-2.5 text-sm">
                {feats.map((f) => (
                  <li key={f} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-up" aria-hidden />{f}</li>
                ))}
              </ul>
              {p === "free" ? (
                <Button asChild variant="secondary" size="lg"><Link href={user ? "/comprar" : "/entrar"}>{t("freeCta")}</Link></Button>
              ) : isCurrent && current?.source !== "free" ? (
                <form action={openBillingPortal}><Button type="submit" variant="secondary" size="lg" className="w-full">{t("manage")}</Button></form>
              ) : (
                <PlanCta plan={p} interval={interval} label={t("subscribe")} perSeat={PLANS[p].perSeat} signedIn={!!user} />
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-16" aria-labelledby="cmp">
        <h2 id="cmp" className="font-display text-3xl font-medium">{t("compare")}</h2>
        <div className="mt-6 overflow-x-auto rounded-[20px] border border-border bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border text-left"><th scope="col" className="p-4"><span className="sr-only">{t("compare")}</span></th>{plans.map((p) => <th key={p} scope="col" className="p-4 font-semibold">{t(`${p}.name`)}</th>)}</tr></thead>
            <tbody>
              {features.map(([label, f]) => (
                <tr key={f} className="border-b border-border last:border-0"><th scope="row" className="p-4 text-left font-medium text-muted">{t(label as "rowAlerts")}</th>{plans.map((p) => <td key={p} className="tnum p-4">{cell(ents[`${p}:${f}`]!)}</td>)}</tr>
              ))}
              <tr className="border-b border-border"><th scope="row" className="p-4 text-left font-medium text-muted">{t("rowFsbo")}</th>{plans.map((p) => <td key={p} className="p-4">{fsbo[p]!.enabled ? t("yes") : t("none")}</td>)}</tr>
              <tr><th scope="row" className="p-4 text-left font-medium text-muted">{t("rowCrm")}</th>{plans.map((p) => <td key={p} className="p-4">{crm[p]!.enabled ? t("yes") : t("none")}</td>)}</tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 max-w-3xl" aria-labelledby="pfaq">
        <h2 id="pfaq" className="font-display text-3xl font-medium">{t("faqTitle")}</h2>
        <div className="mt-4 divide-y divide-border">
          {(["1", "2", "3"] as const).map((n) => (
            <details key={n} className="group py-4"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-medium [&::-webkit-details-marker]:hidden">{t(`faq.q${n}`)}<span aria-hidden className="text-xl text-muted transition-transform group-open:rotate-45">+</span></summary><p className="pt-2 text-muted">{t(`faq.a${n}`)}</p></details>
          ))}
        </div>
      </section>
    </div>
  );
}
