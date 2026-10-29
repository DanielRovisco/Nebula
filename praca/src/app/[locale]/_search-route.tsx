import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { SearchWorkspace } from "@/components/search/search-workspace";
import { siteUrl } from "@/lib/env";
import { parseFilters } from "@/lib/filters";
import { buildSearchHref } from "@/lib/search-url";
import { loadSearchPage } from "@/server/search-page";

type Props = { params: Promise<{ locale: string; slug?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function titleFor(locale: string, business: "sale" | "rent", data: Awaited<ReturnType<typeof loadSearchPage>>) {
  const t = await getTranslations({ locale, namespace: "search" });
  const tt = await getTranslations({ locale, namespace: "types" });
  const place = data.geo.parish?.name ?? data.geo.municipality?.name ?? data.geo.district?.name ?? t("placePortugal");
  const type = data.filters.types.length === 1 ? tt(`${data.filters.types[0]!}_plural`) : null;
  if (type) return business === "sale" ? t("titleBuyType", { type, place }) : t("titleRentType", { type, place });
  return business === "sale" ? t("titleBuy", { place }) : t("titleRent", { place });
}

export async function searchMetadata(business: "sale" | "rent", { params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await loadSearchPage(business, slug, await searchParams);
  const title = await titleFor(locale, business, data);
  // Canonical ignores query-string filters and the map box: one indexable URL per path.
  const base = parseFilters(business, new URLSearchParams());
  base.types = data.filters.types.length === 1 ? data.filters.types : [];
  const canonical = buildSearchHref(base, data.geoSlugs);
  const noindex = Object.keys(await searchParams).length > 0;
  return {
    title,
    description: `${data.initial.total} ${title.toLowerCase()}.`,
    alternates: { canonical: locale === "pt" ? canonical : `/en${canonical}`, languages: { "pt-PT": canonical, en: `/en${canonical}` } },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

export async function SearchRoute(business: "sale" | "rent", { params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await loadSearchPage(business, slug, await searchParams);
  const title = await titleFor(locale, business, data);
  const base = siteUrl + (business === "sale" ? "/comprar" : "/arrendar");
  const crumbs = [
    { name: "Praça", url: siteUrl },
    { name: business === "sale" ? "Comprar" : "Arrendar", url: base },
    ...(data.geo.district ? [{ name: data.geo.district.name, url: `${base}/${data.geo.district.slug}` }] : []),
    ...(data.geo.municipality ? [{ name: data.geo.municipality.name, url: `${base}/${data.geo.district!.slug}/${data.geo.municipality.slug}` }] : []),
  ];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })),
        }}
      />
      <h1 className="sr-only">{title}</h1>
      <SearchWorkspace data={data} />
    </>
  );
}
