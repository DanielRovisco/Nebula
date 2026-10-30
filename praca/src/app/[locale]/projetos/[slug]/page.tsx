import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocationMap } from "@/components/property/location-map";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { getDevelopment } from "@/server/developments";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const d = await getDevelopment((await params).slug);
  return { title: d ? d.name : "Projeto", description: d?.description ?? undefined };
}

export default async function ProjectPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const d = await getDevelopment(slug);
  if (!d) notFound();
  const t = await getTranslations("projects");
  const tt = await getTranslations("types");
  const f = await getFormatter();
  const typ = (n: number | null) => (n == null ? "—" : `T${n}${n === 5 ? "+" : ""}`);
  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <Link href="/projetos" className="text-sm text-brand underline">{t("back")}</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-4xl font-medium sm:text-5xl">{d.name}</h1>
        <Badge tone="outline">{t(`phase.${d.phase}`)}</Badge>
        {d.isSeed && <Badge tone="warn">{t("demoBadge")}</Badge>}
      </div>
      <p className="mt-2 text-lg text-muted">{d.developer}{d.municipality ? ` · ${d.municipality}` : ""}</p>
      {d.description && <p className="mt-6 max-w-[68ch] text-[17px] leading-relaxed">{d.description}</p>}
      <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [t("from"), d.priceFrom != null ? formatEur(d.priceFrom) : "—"],
          [t("units"), d.totalUnits != null ? `${d.availableUnits ?? 0} / ${d.totalUnits}` : "—"],
          [t("delivery"), d.expectedDelivery ? f.dateTime(new Date(d.expectedDelivery), { month: "long", year: "numeric" }) : "—"],
          [t("phaseLabel"), t(`phase.${d.phase}`)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[14px] border border-border bg-surface p-4">
            <dt className="text-xs text-muted">{k}</dt>
            <dd className="tnum mt-1 text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {d.units.length > 0 && (
        <section aria-labelledby="units" className="mt-10">
          <h2 id="units" className="mb-3 text-xl font-semibold">{t("unitsTitle")}</h2>
          <div className="overflow-x-auto rounded-[16px] border border-border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-surface-2 text-left text-xs text-muted">
                <tr><th scope="col" className="px-4 py-2">{tt("apartment")}</th><th scope="col" className="px-4 py-2">{t("area")}</th><th scope="col" className="px-4 py-2">{t("floor")}</th><th scope="col" className="px-4 py-2 text-right">{t("price")}</th><th scope="col" className="px-4 py-2">{t("status")}</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {d.units.map((u, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium">{typ(u.typology)}</td>
                    <td className="tnum px-4 py-2">{u.area ? `${f.number(u.area)} m²` : "—"}</td>
                    <td className="tnum px-4 py-2">{u.floor ?? "—"}</td>
                    <td className="tnum px-4 py-2 text-right">{u.price != null ? formatEur(u.price) : "—"}</td>
                    <td className="px-4 py-2">{t(`unit.${u.status === "available" ? "available" : u.status === "reserved" ? "reserved" : "sold"}`)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {d.lat != null && d.lng != null && (
        <section aria-labelledby="where" className="mt-10">
          <h2 id="where" className="mb-3 text-xl font-semibold">{t("where")}</h2>
          <LocationMap lat={d.lat} lng={d.lng} approximate={d.isSeed} />
        </section>
      )}
      {d.website && <p className="mt-8"><a href={d.website} rel="noopener noreferrer nofollow" target="_blank" className="text-brand underline">{t("website")}</a></p>}
    </div>
  );
}
