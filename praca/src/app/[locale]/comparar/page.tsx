import { Scale } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Link } from "@/i18n/navigation";
import { formatChange, formatEur, formatPricePerM2 } from "@/lib/format";
import { loadComparison } from "@/server/compare";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Comparar imóveis", robots: { index: false } };

export default async function ComparePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ r?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("favorites");
  const tt = await getTranslations("types");
  const tc = await getTranslations("conditions");
  const cm = await getTranslations("common");
  const { r } = await searchParams;
  const cols = await loadComparison((r ?? "").split(","));

  if (cols.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24">
        <EmptyState icon={<Scale className="size-6" aria-hidden />} title={t("compareTitle")} text={t("compareEmpty")} action={<Button asChild><Link href="/comprar">{t("compareEmptyAction")}</Link></Button>} />
      </div>
    );
  }

  const min = (vals: (number | null)[]) => Math.min(...vals.filter((v): v is number => v != null));
  const bestPrice = min(cols.map((c) => c.p.primary.price));
  const bestPpm = min(cols.map((c) => c.p.primary.pricePerM2));
  const rows: { label: string; cell: (c: (typeof cols)[number]) => React.ReactNode; best?: (c: (typeof cols)[number]) => boolean }[] = [
    { label: t("rowPrice"), cell: (c) => <span className="tnum font-semibold">{formatEur(c.p.primary.price)}{c.p.primary.business === "rent" ? cm("perMonth") : ""}</span>, best: (c) => c.p.primary.price === bestPrice },
    { label: t("rowPpm"), cell: (c) => (c.p.primary.pricePerM2 ? <span className="tnum">{formatPricePerM2(c.p.primary.pricePerM2)}</span> : "—"), best: (c) => c.p.primary.pricePerM2 === bestPpm },
    { label: t("rowArea"), cell: (c) => (c.p.usableArea ? `${Math.round(c.p.usableArea)} m²` : "—") },
    { label: t("rowTypology"), cell: (c) => (c.p.typology != null ? `T${c.p.typology}${c.p.typology === 5 ? "+" : ""}` : tt(c.p.type as "apartment")) },
    { label: t("rowBaths"), cell: (c) => c.p.bathrooms ?? "—" },
    { label: t("rowYear"), cell: (c) => c.p.yearBuilt ?? "—" },
    { label: t("rowFloor"), cell: (c) => (c.p.floor != null ? (c.p.floor === 0 ? "R/C" : `${c.p.floor}.º`) : "—") },
    { label: t("rowCondition"), cell: (c) => (c.p.condition ? tc(c.p.condition as "new") : "—") },
    { label: t("rowEnergy"), cell: (c) => (c.p.energyClass ?? "—") },
    { label: t("rowParking"), cell: (c) => c.p.parkingSpaces || "—" },
    { label: t("rowFeatures"), cell: (c) => [c.p.elevator && "Elevador", c.p.balcony && "Varanda", c.p.terrace && "Terraço", c.p.pool && "Piscina", c.p.garden && "Jardim"].filter(Boolean).join(", ") || "—" },
    { label: t("rowZone"), cell: (c) => (c.zone?.pricePerM2 ? <span className="tnum">{formatPricePerM2(c.zone.pricePerM2)} {c.zone.yoy != null && <span className="text-muted">({formatChange(c.zone.yoy)})</span>}</span> : "—") },
    { label: t("rowDays"), cell: (c) => <span className="tnum">{c.days}</span> },
    { label: t("rowDrop"), cell: (c) => (c.p.primary.dropPct > 0 ? <Badge tone="up">−{Math.round(c.p.primary.dropPct)}%</Badge> : "—") },
    { label: t("rowAdvertiser"), cell: (c) => c.p.primary.advertiserName ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="font-display text-4xl font-medium">{t("compareTitle")}</h1>
      <div className="mt-8 overflow-x-auto rounded-[20px] border border-border bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t("compareTitle")}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 p-4 text-left align-bottom text-muted"><span className="sr-only">{t("rowZone")}</span></th>
              {cols.map((c) => (
                <th key={c.p.id} scope="col" className="min-w-52 p-4 text-left align-top">
                  <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-[12px] bg-surface-2">
                    <PropertyImage src={c.p.media[0]?.url ?? null} alt={c.p.primary.title} className="size-full" sizes="260px" />
                  </div>
                  <Link href={`/imovel/${c.p.reference.toLowerCase()}`} className="line-clamp-2 font-semibold hover:underline">
                    {c.p.primary.title}
                  </Link>
                  <p className="mt-0.5 text-xs font-normal text-muted">{[c.p.geo.parish?.name, c.p.geo.municipality?.name].filter(Boolean).join(", ")}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border">
                <th scope="row" className="p-4 text-left font-medium text-muted">{row.label}</th>
                {cols.map((c) => (
                  <td key={c.p.id} className="p-4 align-top">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      {row.cell(c)}
                      {row.best && cols.length > 1 && row.best(c) && <Badge tone="up">{t("best")}</Badge>}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
