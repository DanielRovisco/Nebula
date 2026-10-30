import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ChoroplethMap } from "@/components/market/choropleth-map";
import { Histogram } from "@/components/market/histogram";
import { KpiCard } from "@/components/market/kpi-card";
import { SeriesChart } from "@/components/market/series-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/env";
import { formatChange, formatEur, formatNumber, formatPercent, formatPricePerM2 } from "@/lib/format";
import { getChildren, getDistribution, getKpi, getRank, getSeries, getTransactionSeries, getTypologyTable, resolveZone, type Level } from "@/server/observatory";

export const revalidate = 3600;

type Props = { params: Promise<{ locale: string; zone?: string[] }> };

const siblingsKey: Record<Level, string> = { country: "childDistrict", district: "childDistrict", municipality: "childMunicipality", parish: "childParish" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, zone: slugs } = await params;
  const zone = await resolveZone(slugs ?? []);
  if (!zone) return { title: "—" };
  const t = await getTranslations({ locale, namespace: "market" });
  const kpi = await getKpi(zone.level, zone.code, "sale");
  const path = "/mercado" + zone.path.map((s) => "/" + s).join("");
  return {
    title: zone.level === "country" ? t("titleCountry") : t("title", { name: zone.name }),
    description: t("metaDescription", { name: zone.name, price: kpi ? formatPricePerM2(kpi.ppm) : "—" }),
    alternates: { canonical: locale === "pt" ? path : `/en${path}`, languages: { "pt-PT": path, en: `/en${path}` } },
  };
}

export default async function MarketPage({ params }: Props) {
  const { locale, zone: slugs } = await params;
  setRequestLocale(locale);
  const zone = await resolveZone(slugs ?? []);
  if (!zone) notFound();

  const t = await getTranslations("market");
  const f = await getFormatter();

  const [sale, rent, saleSeries, rentSeries, children, dist, typ, rank, txSeries] = await Promise.all([
    getKpi(zone.level, zone.code, "sale"),
    getKpi(zone.level, zone.code, "rent"),
    getSeries(zone.level, zone.code, "sale"),
    getSeries(zone.level, zone.code, "rent"),
    getChildren(zone),
    getDistribution(zone.level, zone.code),
    getTypologyTable(zone.level, zone.code),
    getRank(zone),
    getTransactionSeries(zone.level, zone.code),
  ]);
  if (!sale && zone.level !== "country") notFound();

  const levelName = (l: Level) => t(`levels.${l}`);
  const period = sale ? f.dateTime(new Date(sale.period + "T00:00:00Z"), { month: "long", year: "numeric" }) : "";
  const meta = sale ? `${t("kpiSample")}: ${formatNumber(sale.n)} · ${period}${sale.isSeed ? " · " + t("seedNote") : ""}` : "";
  const searchPath = zone.path.map((s) => "/" + s).join("");
  const crumbs = [{ name: t("national"), url: `${siteUrl}/mercado`, href: "/mercado" }, ...zone.parents.map((p) => ({ name: p.name, url: `${siteUrl}/mercado/${p.path.join("/")}`, href: `/mercado/${p.path.join("/")}` })), ...(zone.level !== "country" ? [{ name: zone.name, url: `${siteUrl}/mercado${searchPath}`, href: `/mercado${searchPath}` }] : [])];
  const sorted = [...children.rows].sort((a, b) => (b.ppm ?? 0) - (a.ppm ?? 0));
  const childKey = children.level ? (siblingsKey[children.level] as "childDistrict") : "childDistrict";
  const siblingsWord = zone.level === "district" ? (locale === "pt" ? "distritos" : "districts") : zone.level === "municipality" ? (locale === "pt" ? "concelhos do distrito" : "municipalities in the district") : (locale === "pt" ? "freguesias do concelho" : "parishes in the municipality");

  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) },
          sale && { "@context": "https://schema.org", "@type": "Dataset", name: `${t("title", { name: zone.name })}`, description: t("metaDescription", { name: zone.name, price: formatPricePerM2(sale.ppm) }), dateModified: sale.period, creator: { "@type": "Organization", name: "Praça" }, isAccessibleForFree: true, spatialCoverage: zone.name },
        ].filter(Boolean) as Record<string, unknown>[]}
      />
      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6">
        <nav aria-label={t("breadcrumb")} className="mb-4 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden>/</span>}
                {i === crumbs.length - 1 ? <span aria-current="page" className="text-fg">{c.name}</span> : <Link href={c.href} className="hover:text-fg">{c.name}</Link>}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="font-display text-4xl font-medium sm:text-5xl">{zone.level === "country" ? t("titleCountry") : t("title", { name: zone.name })}</h1>
        {sale && <p className="mt-3 max-w-2xl text-muted">{t("sub", { date: period, n: formatNumber(sale.n) })} {sale.isSeed && t("subSeed")}</p>}

        {sale?.aggregatedFrom && (
          <p role="note" className="mt-5 rounded-[14px] bg-warn-soft p-4 text-sm text-warn">
            {t("aggregated", { name: zone.name, n: sale.n, level: levelName(sale.aggregatedFrom) })}
          </p>
        )}

        {sale && (
          <section aria-label={t("kpiPrice")} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard label={t("kpiPrice")} value={formatPricePerM2(sale.ppm)} sub={sale.p25 && sale.p75 ? t("kpiPriceRange", { low: formatEur(sale.p25), high: formatEur(sale.p75) }) : undefined} how={t("howPrice")} anchor="median" meta={meta} />
            <KpiCard label={t("kpiYoy")} value={sale.yoy != null ? formatChange(sale.yoy) : "—"} tone={sale.yoy == null ? undefined : sale.yoy >= 0 ? "up" : "down"} sub={sale.qoq != null ? t("kpiQoq", { value: formatChange(sale.qoq) }) : undefined} how={t("howYoy")} anchor="median" meta={meta} />
            <KpiCard label={t("kpiYield")} value={sale.grossYield != null ? formatPercent(sale.grossYield) : "—"} sub={t("kpiYieldNote")} how={t("howYield")} anchor="yield" meta={meta} />
            <KpiCard label={t("kpiDays")} value={sale.dom != null ? t("kpiDaysValue", { n: sale.dom }) : "—"} how={t("howDays")} anchor="median" meta={meta} />
            <KpiCard label={t("kpiDiscount")} value={sale.discount != null ? formatPercent(sale.discount) : "—"} how={t("howDiscount")} anchor="asking" meta={meta} />
          </section>
        )}

        <section className="mt-12 grid gap-6 lg:grid-cols-2" aria-label={t("seriesSale")}>
          <div className="rounded-[20px] border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">{t("seriesSale")}</h2>
            <p className="mb-3 text-xs text-muted">{t("seriesNote", { months: saleSeries.length })} · {t("perM2")}</p>
            <SeriesChart data={saleSeries} label={t("seriesSale")} unit="sale" />
          </div>
          <div className="rounded-[20px] border border-border bg-surface p-5">
            <h2 className="text-lg font-semibold">{t("seriesRent")}</h2>
            <p className="mb-3 text-xs text-muted">{t("seriesNote", { months: rentSeries.length })} · {t("perM2Month")}</p>
            <SeriesChart data={rentSeries} label={t("seriesRent")} unit="rent" />
            {rent && <p className="tnum mt-2 text-sm text-muted">{t("kpiPrice")}: {f.number(rent.ppm, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {t("perM2Month")}</p>}
          </div>
        </section>

        {children.features.length > 0 && children.level && (
          <section className="mt-14" aria-labelledby="heat">
            <h2 id="heat" className="font-display text-3xl font-medium">{t("mapTitle")}</h2>
            <p className="mt-1 text-muted">{t("mapSub", { child: t(childKey) })}</p>
            <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-[20px] border border-border bg-surface p-4"><ChoroplethMap features={children.features} /></div>
              <div className="min-w-0 overflow-x-auto rounded-[20px] border border-border bg-surface">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t("childrenTitle", { children: t(childKey), name: zone.name })}</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted">
                      <th scope="col" className="p-3 font-medium">{t("colName")}</th>
                      <th scope="col" className="p-3 text-right font-medium">{t("colPrice")}</th>
                      <th scope="col" className="p-3 text-right font-medium">{t("colYoy")}</th>
                      <th scope="col" className="hidden p-3 text-right font-medium sm:table-cell">{t("colYield")}</th>
                      <th scope="col" className="p-3 text-right font-medium">{t("colN")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.slice(0, 60).map((c) => (
                      <tr key={c.code} className="border-b border-border last:border-0">
                        <th scope="row" className="p-3 text-left font-medium">
                          <Link href={`/mercado/${c.path.join("/")}`} className="hover:underline">{c.name}</Link>
                          {c.aggregated && <Badge tone="outline" className="ml-2">{t("aggBadge")}</Badge>}
                        </th>
                        <td className="tnum p-3 text-right">{c.ppm ? formatNumber(c.ppm) : "—"}</td>
                        <td className={`tnum p-3 text-right ${c.yoy != null ? (c.yoy >= 0 ? "text-up" : "text-down") : ""}`}>{c.yoy != null ? formatChange(c.yoy) : "—"}</td>
                        <td className="tnum hidden p-3 text-right sm:table-cell">{c.grossYield != null ? formatPercent(c.grossYield) : "—"}</td>
                        <td className="tnum p-3 text-right text-muted">{c.n || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div aria-labelledby="dist">
            <h2 id="dist" className="font-display text-3xl font-medium">{t("distTitle")}</h2>
            {dist ? (
              <>
                <p className="mb-4 mt-1 text-muted">{t("distSub", { n: formatNumber(dist.n) })}</p>
                <div className="rounded-[20px] border border-border bg-surface p-4"><Histogram buckets={dist.buckets} /></div>
              </>
            ) : (
              <p className="mt-2 text-muted">{t("distNone")}</p>
            )}
          </div>
          <div aria-labelledby="typ">
            <h2 id="typ" className="font-display text-3xl font-medium">{t("typTitle")}</h2>
            <p className="mb-4 mt-1 text-muted">{t("typSub")}</p>
            {typ.rows.length ? (
              <div className="overflow-x-auto rounded-[20px] border border-border bg-surface">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{t("typName")}</th><th scope="col" className="p-3 text-right font-medium">{t("colPrice")}</th><th scope="col" className="p-3 text-right font-medium">{t("typPrice")}</th><th scope="col" className="p-3 text-right font-medium">{t("typArea")}</th><th scope="col" className="p-3 text-right font-medium">{t("colN")}</th></tr></thead>
                  <tbody>
                    {typ.rows.map((r) => (
                      <tr key={r.typology} className="border-b border-border last:border-0"><th scope="row" className="p-3 text-left font-medium">T{r.typology}{r.typology === 5 ? "+" : ""}</th><td className="tnum p-3 text-right">{formatNumber(r.ppm)}</td><td className="tnum p-3 text-right">{formatEur(Math.round(r.medianPrice / 1000) * 1000)}</td><td className="tnum p-3 text-right">{formatNumber(r.area)} m²</td><td className="tnum p-3 text-right text-muted">{r.n}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">{t("typNone")}</p>
            )}
            {typ.hidden > 0 && typ.rows.length > 0 && <p className="mt-2 text-xs text-muted">{t("typHidden", { count: typ.hidden })}</p>}
          </div>
        </section>

        <section className="mt-14 rounded-[20px] border border-border bg-surface p-6" aria-labelledby="tx">
          <h2 id="tx" className="text-lg font-semibold">{t("txTitle")}</h2>
          {txSeries.length ? (
            <div className="mt-3">
              <SeriesChart data={txSeries.map((r) => ({ period: r.period, ppm: r.ppm, p25: null, p75: null }))} label={t("txTitle")} unit="sale" height={200} />
              <p className="mt-2 text-xs text-muted">{t("txSource", { source: [...new Set(txSeries.map((r) => r.source))].join(", ") })}</p>
            </div>
          ) : (
            <p className="mt-2 max-w-2xl text-muted">{t("txNone")} <Link href="/metodologia" className="text-brand underline underline-offset-2">{t("txLink")}</Link></p>
          )}
        </section>

        {sale && (
          <section className="mt-14 max-w-3xl" aria-labelledby="sum">
            <h2 id="sum" className="font-display text-3xl font-medium">{t("textTitle")}</h2>
            <p className="mt-3 text-[17px] leading-relaxed">
              {t("textMain", { name: zone.name, price: formatPricePerM2(sale.ppm), n: formatNumber(sale.n), period })}{" "}
              {sale.yoy != null && (sale.yoy >= 0 ? t("textYoyUp", { value: formatPercent(Math.abs(sale.yoy)) }) : t("textYoyDown", { value: formatPercent(Math.abs(sale.yoy)) }))}{" "}
              {rank && zone.level !== "country" && t("textRank", { rank: rank.rank, total: rank.total, siblings: siblingsWord })}{" "}
              {sale.grossYield != null && t("textYield", { value: formatPercent(sale.grossYield) })}{" "}
              {sale.dom != null && t("textDays", { n: sale.dom })}
            </p>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          {zone.level !== "country" && (
            <>
              <Button asChild><Link href={`/comprar${searchPath}`}>{t("ctaBuy", { name: zone.name })}<ArrowRight aria-hidden /></Link></Button>
              <Button asChild variant="secondary"><Link href={`/arrendar${searchPath}`}>{t("ctaRent", { name: zone.name })}</Link></Button>
            </>
          )}
          <Button asChild variant="soft"><Link href="/mercado/analitica">{t("ctaCompare")}</Link></Button>
        </div>
        <p className="mt-8 text-xs text-muted">{t("sourceNote", { seed: sale?.isSeed ? t("seedNote") : "" })}</p>
      </div>
    </>
  );
}
