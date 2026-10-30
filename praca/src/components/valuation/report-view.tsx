import { getFormatter, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatEur, formatEur2, formatPercent } from "@/lib/format";
import type { ValuationRecord } from "@/server/valuation-data";

const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n * 1000) / 10).toString().replace(".", ",")}%`;

/** The valuation report, shared by the private page and the public SmartLink. */
export async function ReportView({ rec, publicView }: { rec: ValuationRecord; publicView?: boolean }) {
  const t = await getTranslations("valuation");
  const tt = await getTranslations("types");
  const tc = await getTranslations("conditions");
  const f = await getFormatter();
  const o = rec.outcome;
  const s = o.sale;
  const input = o.input;
  const radius = o.radiusM >= 1000 ? `${o.radiusM / 1000} km` : `${o.radiusM} m`;
  const accent = rec.brand?.color && /^#[0-9a-f]{6}$/i.test(rec.brand.color) ? rec.brand.color : undefined;

  if (!s) return null;
  return (
    <article className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6" style={accent ? { borderColor: accent } : undefined}>
        <div className="flex items-center gap-4">
          {/* Agency logo: user-supplied URL, so a plain img with no referrer. */}
          {rec.brand?.logoUrl && /^https?:\/\//.test(rec.brand.logoUrl) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rec.brand.logoUrl} alt={rec.brand.name} referrerPolicy="no-referrer" className="h-12 w-auto max-w-40 object-contain" />
          )}
          <div>
            <p className="text-sm text-muted">{rec.brand?.name ?? rec.agent?.name ?? "Praça"}</p>
            <h1 className="font-display text-3xl font-medium sm:text-4xl">{t("reportTitle")}</h1>
          </div>
        </div>
        <p className="text-sm text-muted">{t("date", { date: f.dateTime(new Date(o.computedAt), "short") })}</p>
      </header>

      <section aria-labelledby="subject">
        <h2 id="subject" className="text-lg font-semibold">{t("subjectTitle")}</h2>
        <dl className="mt-3 grid gap-x-8 sm:grid-cols-2">
          {[
            [t("type"), tt(input.type as "apartment")],
            input.typology != null && (input.type === "apartment" || input.type === "house") ? [t("typology"), `T${input.typology}`] : null,
            [t("area"), `${input.area} m²`],
            input.yearBuilt ? [t("year"), input.yearBuilt] : null,
            input.condition ? [t("condition"), tc(input.condition)] : null,
            input.floor != null ? [t("floor"), input.floor === 0 ? "R/C" : `${input.floor}.º`] : null,
            input.address ? [t("address"), input.address] : null,
            input.cadastralRef ? [t("cadastral"), input.cadastralRef] : null,
          ].filter((r): r is [string, string | number] => !!r).map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-4 border-b border-border py-2 text-sm"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </section>

      <section className="rounded-[20px] border border-border bg-surface p-6" aria-labelledby="est">
        <h2 id="est" className="text-sm text-muted">{t("estimate")}</h2>
        <p className="tnum font-display mt-1 text-5xl font-medium" style={accent ? { color: accent } : undefined}>{formatEur(s.value)}</p>
        <p className="mt-2 text-lg">{t("range", { low: formatEur(s.low), high: formatEur(s.high) })}</p>
        <p className="tnum text-sm text-muted">{t("perM2", { value: formatEur(s.pricePerM2) })}</p>
        <p className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={s.level === "high" ? "up" : s.level === "medium" ? "warn" : "outline"}>{t("confidence", { level: t(`levels.${s.level}`) })}</Badge>
          <span className="text-muted">{t("basis", { n: s.n, radius, sim: Math.round(s.avgSimilarity * 100) })}</span>
        </p>
        <p className="mt-3 text-xs text-muted">{t("askingNote")}</p>
      </section>

      <section aria-labelledby="rent" className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[20px] border border-border bg-surface p-6">
          <h2 id="rent" className="text-sm text-muted">{t("rentTitle")}</h2>
          {o.rent ? (
            <>
              <p className="tnum font-display mt-1 text-3xl font-medium">{formatEur(o.rent.value)}<span className="text-base text-muted"> /mês</span></p>
              <p className="text-sm text-muted">{t("rentRange", { low: formatEur(o.rent.low), high: formatEur(o.rent.high) })}</p>
              {o.grossYield != null && <p className="mt-2 text-sm font-medium">{t("yield", { value: formatPercent(o.grossYield) })}</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">{t("noRent")}</p>
          )}
        </div>
        {(rec.agent || rec.brand) && (
          <div className="rounded-[20px] border border-border bg-surface p-6 text-sm">
            <h2 className="text-sm text-muted">{t("agentTitle")}</h2>
            <p className="mt-1 text-lg font-semibold">{rec.agent?.name ?? rec.brand?.name}</p>
            {rec.agent?.amiNumber && <p className="text-muted">{rec.agent.amiStatus === "verified" ? t("amiVerified", { n: rec.agent.amiNumber }) : t("amiPending", { n: rec.agent.amiNumber })}</p>}
            {!publicView && rec.agent?.email && <p className="text-muted">{rec.agent.email}</p>}
            {publicView && (rec.brand?.email ?? rec.agent?.email) && <p className="text-muted">{rec.brand?.email ?? rec.agent?.email}</p>}
            {rec.brand?.phone && <p className="text-muted">{rec.brand.phone}</p>}
          </div>
        )}
      </section>

      <section aria-labelledby="comps">
        <h2 id="comps" className="text-lg font-semibold">{t("compTitle")}</h2>
        <p className="mt-1 text-sm text-muted">{t("compSub")}</p>
        <div className="mt-4 overflow-x-auto rounded-[20px] border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("colProperty")}</th><th scope="col" className="p-3 font-medium">{t("colKind")}</th><th scope="col" className="p-3 text-right font-medium">{t("colDistance")}</th><th scope="col" className="p-3 text-right font-medium">{t("colPrice")}</th><th scope="col" className="p-3 text-right font-medium">{t("colPpm")}</th><th scope="col" className="p-3 text-right font-medium">{t("colSim")}</th><th scope="col" className="p-3 font-medium">{t("colAdj")}</th></tr></thead>
            <tbody>
              {s.comparables.map((c) => {
                const adj = [["adjCondition", c.adjustments.condition], ["adjFloor", c.adjustments.floor], ["adjArea", c.adjustments.area]].filter(([, v]) => Math.abs(v as number) >= 0.005) as [string, number][];
                return (
                  <tr key={c.id} className="border-b border-border last:border-0">
                    <th scope="row" className="max-w-56 p-3 text-left font-medium">
                      {publicView ? <span className="line-clamp-1">{c.title}</span> : <Link href={`/imovel/${c.reference.toLowerCase()}`} className="line-clamp-1 hover:underline">{c.title}</Link>}
                    </th>
                    <td className="p-3"><Badge tone={c.kind === "active" ? "brand" : "neutral"}>{t(`kind.${c.kind}`)}</Badge></td>
                    <td className="tnum p-3 text-right">{c.distanceM >= 1000 ? `${(c.distanceM / 1000).toFixed(1).replace(".", ",")} km` : `${c.distanceM} m`}</td>
                    <td className="tnum p-3 text-right">{formatEur(c.price)}</td>
                    <td className="tnum p-3 text-right">{formatEur2(c.adjustedPpm).replace(/\s?€/, " €")}</td>
                    <td className="tnum p-3 text-right">{Math.round(c.similarity * 100)}%</td>
                    <td className="p-3 text-xs text-muted">{adj.length ? adj.map(([k, v]) => `${t(k as "adjArea")} ${pct(v)}`).join(" · ") : t("noAdj")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="meth" className="max-w-3xl">
        <h2 id="meth" className="text-lg font-semibold">{t("methodTitle")}</h2>
        <p className="mt-2 text-muted">{t("method")} <Link href="/metodologia#estimate" className="text-brand underline underline-offset-2">{t("methodLink")}</Link></p>
        <p className="mt-3 text-xs text-muted">{t("disclaimer")}</p>
      </section>
    </article>
  );
}
