import { Download, Lock } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CompareChart } from "@/components/market/compare-chart";
import { ZonePicker } from "@/components/market/zone-picker";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatChange, formatNumber, formatPercent, formatPricePerM2 } from "@/lib/format";
import { pearson } from "@/lib/stats";
import { effectivePlan, getEntitlement } from "@/server/entitlements";
import { getChildren, getKpi, getSeries, resolveCodes, resolveZone } from "@/server/observatory";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Analítica de zonas", robots: { index: false } };

export default async function AnalyticsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ z?: string; m?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("market.analytics");
  const tm = await getTranslations("market");
  const sp = await searchParams;
  const user = await currentUser();
  const plan = user ? (await effectivePlan(user.id)).plan : "free";
  const allowed = user ? (await getEntitlement(plan, "exports")).enabled : false;

  if (!allowed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <div role="status" className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand"><Lock className="size-6" aria-hidden /></div>
          <h1 className="font-display text-3xl font-medium">{t("gateTitle")}</h1>
          <p className="max-w-md text-muted">{t("gateText")}</p>
          <Button asChild><Link href="/planos">{t("gateCta")}</Link></Button>
        </div>
      </div>
    );
  }

  const mode = sp.m === "abs" ? "abs" : "index";
  const zones = await resolveCodes((sp.z ?? "1106,1312").split(","));
  const data = await Promise.all(zones.map(async (z) => ({ z, series: await getSeries(z.level, z.code, "sale"), kpi: await getKpi(z.level, z.code, "sale") })));

  // Scatter: children of the first zone (price vs days on market).
  const first = zones[0] && zones[0].level !== "parish" ? await resolveZone(zones[0].path) : null;
  const kids = first ? await getChildren(first) : null;
  const pts = (kids?.rows ?? []).filter((r) => r.ppm && r.dom != null && !r.aggregated);
  const r = pearson(pts.map((p) => p.ppm!), pts.map((p) => p.dom!));

  const W = 560, H = 300, pad = { l: 48, r: 12, t: 12, b: 36 };
  const xs = pts.map((p) => p.ppm!), ys = pts.map((p) => p.dom!);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const X = (v: number) => pad.l + ((v - minX) / (maxX - minX || 1)) * (W - pad.l - pad.r);
  const Y = (v: number) => H - pad.b - ((v - minY) / (maxY - minY || 1)) * (H - pad.t - pad.b);
  const childWord = kids?.level === "district" ? tm("childDistrict") : kids?.level === "parish" ? tm("childParish") : tm("childMunicipality");

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="font-display text-4xl font-medium">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-muted">{t("sub")}</p>

      <div className="mt-8"><ZonePicker zones={zones.map((z) => ({ code: z.code, name: z.name }))} mode={mode} /></div>

      {zones.length === 0 ? (
        <p className="mt-10 text-muted">{t("noZones")}</p>
      ) : (
        <>
          <section className="mt-10 rounded-[20px] border border-border bg-surface p-5" aria-labelledby="cmp">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="cmp" className="text-lg font-semibold">{mode === "index" ? t("indexed") : t("absolute")}</h2>
              <div className="flex items-center gap-2">
                <div role="group" aria-label={t("modeIndex")} className="inline-flex rounded-full bg-surface-2 p-1 text-sm">
                  <Link href={`/mercado/analitica?z=${zones.map((z) => z.code).join(",")}`} aria-current={mode === "index" ? "true" : undefined} className={`flex min-h-9 items-center rounded-full px-4 font-medium ${mode === "index" ? "bg-surface shadow-sm" : "text-muted"}`}>{t("modeIndex")}</Link>
                  <Link href={`/mercado/analitica?z=${zones.map((z) => z.code).join(",")}&m=abs`} aria-current={mode === "abs" ? "true" : undefined} className={`flex min-h-9 items-center rounded-full px-4 font-medium ${mode === "abs" ? "bg-surface shadow-sm" : "text-muted"}`}>{t("modeAbs")}</Link>
                </div>
                <Button asChild size="sm" variant="secondary"><a href={`/api/market/export?z=${zones.map((z) => z.code).join(",")}`}><Download aria-hidden />{t("export")}</a></Button>
              </div>
            </div>
            {mode === "index" && <p className="mb-3 mt-1 text-xs text-muted">{t("indexedNote")}</p>}
            <CompareChart mode={mode} series={data.map((d) => ({ name: d.z.name, points: d.series.map((s) => ({ period: s.period, v: s.ppm })) }))} />
          </section>

          <section className="mt-8 overflow-x-auto rounded-[20px] border border-border bg-surface" aria-label={t("compareTable")}>
            <table className="w-full min-w-[560px] text-sm">
              <caption className="sr-only">{t("compareTable")}</caption>
              <thead><tr className="border-b border-border text-left text-xs text-muted"><th scope="col" className="p-3 font-medium">{tm("colName")}</th><th scope="col" className="p-3 text-right font-medium">{tm("colPrice")}</th><th scope="col" className="p-3 text-right font-medium">{tm("colYoy")}</th><th scope="col" className="p-3 text-right font-medium">{tm("colYield")}</th><th scope="col" className="p-3 text-right font-medium">{tm("colDays")}</th><th scope="col" className="p-3 text-right font-medium">{tm("colN")}</th></tr></thead>
              <tbody>
                {data.map((d, i) => (
                  <tr key={d.z.code} className="border-b border-border last:border-0">
                    <th scope="row" className="p-3 text-left font-medium"><span className="mr-2 inline-block size-2.5 rounded-full" style={{ background: `var(--d${i + 1})` }} aria-hidden /><Link href={`/mercado/${d.z.path.join("/")}`} className="hover:underline">{d.z.name}</Link></th>
                    <td className="tnum p-3 text-right">{d.kpi ? formatPricePerM2(d.kpi.ppm) : "—"}</td>
                    <td className="tnum p-3 text-right">{d.kpi?.yoy != null ? formatChange(d.kpi.yoy) : "—"}</td>
                    <td className="tnum p-3 text-right">{d.kpi?.grossYield != null ? formatPercent(d.kpi.grossYield) : "—"}</td>
                    <td className="tnum p-3 text-right">{d.kpi?.dom ?? "—"}</td>
                    <td className="tnum p-3 text-right text-muted">{d.kpi ? formatNumber(d.kpi.n) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {first && (
            <section className="mt-10 rounded-[20px] border border-border bg-surface p-5" aria-labelledby="sc">
              <h2 id="sc" className="text-lg font-semibold">{t("scatterTitle")}</h2>
              {r != null && pts.length >= 3 ? (
                <>
                  <p className="mb-3 mt-1 text-sm text-muted">{t("scatterSub", { child: childWord, name: first.name, r: r.toFixed(2).replace(".", ","), n: pts.length })}</p>
                  <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t("scatterTitle")} className="h-auto w-full max-w-2xl">
                    <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--border-strong)" />
                    <line x1={pad.l} x2={pad.l} y1={pad.t} y2={H - pad.b} stroke="var(--border-strong)" />
                    {[minX, (minX + maxX) / 2, maxX].map((v) => <text key={v} x={X(v)} y={H - 18} fontSize="11" fill="var(--muted)" textAnchor="middle" className="tnum">{formatNumber(v)}</text>)}
                    {[minY, (minY + maxY) / 2, maxY].map((v) => <text key={v} x={pad.l - 6} y={Y(v)} fontSize="11" fill="var(--muted)" textAnchor="end" dominantBaseline="central" className="tnum">{Math.round(v)}</text>)}
                    <text x={(W + pad.l) / 2} y={H - 2} fontSize="11" fill="var(--muted)" textAnchor="middle">{t("scatterX")}</text>
                    <text transform={`translate(12 ${(H - pad.b) / 2}) rotate(-90)`} fontSize="11" fill="var(--muted)" textAnchor="middle">{t("scatterY")}</text>
                    {pts.map((p) => (
                      <circle key={p.code} cx={X(p.ppm!)} cy={Y(p.dom!)} r={5} fill="var(--d1)" fillOpacity={0.75} stroke="var(--surface)" strokeWidth={1.5}><title>{`${p.name}: ${formatPricePerM2(p.ppm!)}, ${p.dom} dias`}</title></circle>
                    ))}
                  </svg>
                </>
              ) : (
                <p className="mt-2 text-muted">{t("corrNone")}</p>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
