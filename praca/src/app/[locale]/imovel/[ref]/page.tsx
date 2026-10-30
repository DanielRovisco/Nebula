import { Calendar, Check, MapPin, TrendingDown } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PropertyCard } from "@/components/property-card";
import { Calculators } from "@/components/property/calculators";
import { ContactForm } from "@/components/property/contact-form";
import { Gallery } from "@/components/property/gallery";
import { LocationMap } from "@/components/property/location-map";
import { PriceChart } from "@/components/property/price-chart";
import { PrintButton, ShareButton } from "@/components/property/share-buttons";
import { CompareToggle, FavoriteButton } from "@/components/user-state";
import { currentUser } from "@/server/session";
import { sql } from "@/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteUrl } from "@/lib/env";
import { formatChange, formatDate, formatEur, formatPricePerM2 } from "@/lib/format";
import { getFiscalTable, getRate } from "@/server/fiscal";
import { estimateFor, getComparables, getPropertyByReference, getZoneStats } from "@/server/properties";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; ref: string }> };

const LD_TYPE: Record<string, string> = { apartment: "Apartment", house: "House", land: "Landform", shop: "Place", office: "Place", warehouse: "Place", garage: "Place", building: "Place" };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, ref } = await params;
  const p = await getPropertyByReference(ref).catch(() => null);
  if (!p) return { title: "—" };
  const place = [p.geo.parish?.name, p.geo.municipality?.name].filter(Boolean).join(", ");
  const price = formatEur(p.primary.price) + (p.primary.business === "rent" ? "/mês" : "");
  const url = `/imovel/${p.reference.toLowerCase()}`;
  return {
    title: `${p.primary.title} · ${price}`,
    description: `${p.primary.title}, ${place}. ${p.primary.description?.slice(0, 140) ?? ""}`,
    alternates: { canonical: locale === "pt" ? url : `/en${url}`, languages: { "pt-PT": url, en: `/en${url}` } },
    openGraph: { title: p.primary.title, description: `${price} · ${place}`, type: "article", images: [{ url: `/imovel/${p.reference.toLowerCase()}/opengraph-image`, width: 1200, height: 630 }] },
    robots: p.primary.status === "active" ? undefined : { index: false, follow: true },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { locale, ref } = await params;
  setRequestLocale(locale);
  const p = await getPropertyByReference(ref);
  if (!p) notFound();

  const t = await getTranslations("property");
  const tt = await getTranslations("types");
  const tc = await getTranslations("conditions");
  const tv = await getTranslations("views");
  const tn = await getTranslations("nav");
  const cm = await getTranslations("common");
  const tf = await getTranslations("filters");
  const f = await getFormatter();

  const l = p.primary;
  const rent = l.business === "rent";
  const active = l.status === "active";
  const [comps, zone, euribor, imtHpp, imtOther, stamp] = await Promise.all([
    getComparables(p, 12).catch(() => []),
    getZoneStats(p).catch(() => null),
    getRate("euribor_6m").catch(() => null),
    getFiscalTable("imt", "hpp_mainland").catch(() => null),
    getFiscalTable("imt", "other_urban").catch(() => null),
    getFiscalTable("stamp_duty_purchase", "all").catch(() => null),
  ]);
  const viewer = await currentUser();
  if (viewer) {
    // Viewing history (signed-in only); failures must never break the page.
    sql`INSERT INTO property_views (user_id, property_id) VALUES (${viewer.id}, ${p.id}) ON CONFLICT (user_id, property_id) DO UPDATE SET viewed_at = now()`.catch(() => {});
  }
  const est = estimateFor(p, comps);
  const diff = est ? (l.price - est.value) / est.value : null;
  const daysOnMarket = Math.max(0, Math.round((Date.now() - new Date(l.publishedAt).getTime()) / 86_400_000));
  const place = [p.geo.parish?.name, p.geo.municipality?.name].filter(Boolean).join(", ");
  const base = rent ? "/arrendar" : "/comprar";
  const priceText = formatEur(l.price) + (rent ? cm("perMonth") : "");

  const floorText = p.floor == null ? null : p.floor === 0 ? t("floorGround") : p.floor < 0 ? t("floorBasement") : p.totalFloors ? t("floorOf", { floor: p.floor, total: p.totalFloors }) : `${p.floor}.º`;

  const specs: [string, string | number | null][] = [
    [t("specsLabels.type"), tt(p.type as "apartment")],
    [t("specsLabels.typology"), p.typology != null && (p.type === "apartment" || p.type === "house") ? `T${p.typology}${p.typology === 5 ? "+" : ""}` : null],
    [t("specsLabels.bedrooms"), p.bedrooms],
    [t("specsLabels.bathrooms"), p.bathrooms],
    [t("specsLabels.usableArea"), p.usableArea ? `${f.number(p.usableArea)} m²` : null],
    [t("specsLabels.grossArea"), p.grossArea ? `${f.number(p.grossArea)} m²` : null],
    [t("specsLabels.plotArea"), p.plotArea ? `${f.number(p.plotArea)} m²` : null],
    [t("specsLabels.yearBuilt"), p.yearBuilt],
    [t("specsLabels.floor"), floorText],
    [t("specsLabels.condition"), p.condition ? tc(p.condition as "new") : null],
    [t("specsLabels.energy"), p.energyClass ? (p.energyClass === "exempt" ? tf("energyExempt") : p.energyClass) : null],
    [t("specsLabels.parking"), p.parkingSpaces || null],
    [t("specsLabels.view"), p.view ? tv(p.view as "mar") : null],
    [t("specsLabels.perM2"), l.pricePerM2 ? formatPricePerM2(l.pricePerM2) : null],
  ];
  const amenities: [string, boolean][] = [
    [t("specsLabels.elevator"), p.elevator],
    [t("specsLabels.balcony"), p.balcony],
    [t("specsLabels.terrace"), p.terrace],
    [t("specsLabels.pool"), p.pool],
    [t("specsLabels.garden"), p.garden],
    ...(rent ? ([[t("specsLabels.furnished"), p.furnished === true], [t("specsLabels.pets"), p.petsAllowed === true]] as [string, boolean][]) : []),
  ];

  const url = `${siteUrl}/imovel/${p.reference.toLowerCase()}`;
  const crumbs = [
    { name: "Praça", url: siteUrl },
    { name: rent ? tn("rent") : tn("buy"), url: siteUrl + base },
    ...(p.geo.district ? [{ name: p.geo.district.name, url: `${siteUrl}${base}/${p.geo.district.slug}` }] : []),
    ...(p.geo.municipality && p.geo.district ? [{ name: p.geo.municipality.name, url: `${siteUrl}${base}/${p.geo.district.slug}/${p.geo.municipality.slug}` }] : []),
    { name: p.reference, url },
  ];

  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: l.title,
            url,
            datePosted: l.publishedAt,
            description: l.description ?? undefined,
            image: p.media.slice(0, 5).map((m) => siteUrl + m.url),
            offers: { "@type": "Offer", price: l.price, priceCurrency: "EUR", availability: active ? "https://schema.org/InStock" : "https://schema.org/SoldOut" },
            about: {
              "@type": LD_TYPE[p.type] ?? "Accommodation",
              floorSize: p.usableArea ? { "@type": "QuantitativeValue", value: p.usableArea, unitCode: "MTK" } : undefined,
              numberOfRooms: p.bedrooms ?? undefined,
              address: { "@type": "PostalAddress", addressLocality: p.geo.municipality?.name, addressRegion: p.geo.district?.name, addressCountry: "PT", postalCode: p.postalCode ?? undefined },
              geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng },
            },
          },
          { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.url })) },
        ]}
      />

      <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
        <nav aria-label={t("breadcrumb")} className="mb-4 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li><Link href={base} className="hover:text-fg">{rent ? tn("rent") : tn("buy")}</Link></li>
            {p.geo.district && <li aria-hidden>/</li>}
            {p.geo.district && <li><Link href={`${base}/${p.geo.district.slug}`} className="hover:text-fg">{p.geo.district.name}</Link></li>}
            {p.geo.municipality && p.geo.district && <li aria-hidden>/</li>}
            {p.geo.municipality && p.geo.district && <li><Link href={`${base}/${p.geo.district.slug}/${p.geo.municipality.slug}`} className="hover:text-fg">{p.geo.municipality.name}</Link></li>}
          </ol>
        </nav>

        {!active && (
          <div role="status" className="mb-6 rounded-[16px] border border-warn/40 bg-warn-soft p-4 text-warn">
            <p className="font-semibold">{t("unavailableTitle")}</p>
            <p className="text-sm">{t("unavailableText")}</p>
          </div>
        )}

        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              {l.advertiserType === "private" && <Badge tone="brand">{cm("private")}</Badge>}
              {l.verified && <Badge tone="neutral"><Check className="size-3" aria-hidden /> {cm("verified")}</Badge>}
              {p.isSeed && <Badge tone="warn">{cm("demoBadge")}</Badge>}
              <Badge tone="outline">{t("reference", { ref: p.reference })}</Badge>
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl">{l.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted">
              <MapPin className="size-4" aria-hidden />
              {[p.address, place].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="no-print flex items-center gap-2">
            <FavoriteButton propertyId={p.id} className="border border-border-strong" />
            <CompareToggle reference={p.reference} className="border border-border-strong" />
            <ShareButton title={l.title} copiedLabel={cm("copied")} label={cm("share")} />
            <PrintButton label={cm("print")} />
            <Button asChild variant="secondary" size="sm"><Link href={`/avaliar?ref=${p.reference}`}>{t("valueThis")}</Link></Button>
          </div>
        </div>

        <Gallery images={p.media} title={l.title} />

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-12">
            {/* price + overview (mobile first: price leads) */}
            <section aria-label={t("overview")} className="space-y-4">
              <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <p className="tnum font-display text-4xl font-medium">{priceText}</p>
                {l.pricePerM2 && <p className="tnum pb-1 text-muted">{formatPricePerM2(l.pricePerM2)}</p>}
                {l.dropPct > 0 && (
                  <Badge tone="up" className="mb-1.5 text-sm">
                    <TrendingDown className="size-3.5" aria-hidden />
                    {t("priceChange", { pct: `${f.number(l.dropPct, { maximumFractionDigits: 1 })} %`, date: formatDate(l.publishedAt) })}
                  </Badge>
                )}
              </div>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Calendar className="size-4" aria-hidden />
                {t("publishedOn", { date: formatDate(l.publishedAt) })} · {t("onMarket", { n: daysOnMarket })}
              </p>
            </section>

            {l.description && (
              <section aria-labelledby="desc">
                <h2 id="desc" className="mb-3 text-xl font-semibold">{t("description")}</h2>
                <p className="max-w-[68ch] whitespace-pre-line text-[17px] leading-relaxed">{l.description}</p>
                {(l.videoUrl || l.tourUrl) && (
                  <p className="mt-3 flex gap-4 text-sm">
                    {l.videoUrl && <a href={l.videoUrl} className="text-brand underline" rel="noopener noreferrer" target="_blank">{t("video")}</a>}
                    {l.tourUrl && <a href={l.tourUrl} className="text-brand underline" rel="noopener noreferrer" target="_blank">{t("virtualTour")}</a>}
                  </p>
                )}
              </section>
            )}

            <section aria-labelledby="specs">
              <h2 id="specs" className="mb-3 text-xl font-semibold">{t("specs")}</h2>
              <dl className="grid gap-x-8 sm:grid-cols-2">
                {specs.filter(([, v]) => v != null && v !== "").map(([k, v]) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-[15px]">
                    <dt className="text-muted">{k}</dt>
                    <dd className="tnum text-right font-medium">{v}</dd>
                  </div>
                ))}
                {!rent && (
                  <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-[15px]">
                    <dt className="text-muted">{t("specsLabels.tenanted")}</dt>
                    <dd className="font-medium">{p.tenanted ? t("specsLabels.tenantedYes") : t("specsLabels.tenantedNo")}</dd>
                  </div>
                )}
              </dl>
              <ul className="mt-4 flex flex-wrap gap-2">
                {amenities.filter(([, v]) => v).map(([k]) => (
                  <li key={k}><Badge tone="neutral" className="px-3 py-1 text-sm"><Check className="size-3.5" aria-hidden />{k}</Badge></li>
                ))}
              </ul>
            </section>

            {/* estimate */}
            <section aria-labelledby="est" className="rounded-[20px] border border-border bg-surface p-5 sm:p-6">
              <h2 id="est" className="text-xl font-semibold">{t("estimate")}</h2>
              {est ? (
                <div className="mt-3 space-y-2">
                  <p className="tnum font-display text-3xl font-medium">{formatEur(est.value)}</p>
                  <p className="text-muted">{t("estimateRange", { low: formatEur(est.low), high: formatEur(est.high) })}</p>
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge tone={est.level === "high" ? "up" : est.level === "medium" ? "warn" : "outline"}>{t("estimateConfidence", { level: t(`confidence.${est.level}`) })}</Badge>
                    <span className="text-muted">{rent ? t("estimateBasisRent", { n: est.n }) : t("estimateBasis", { n: est.n })}</span>
                  </p>
                  {diff != null && Math.abs(diff) >= 0.02 && (
                    <p className="text-sm font-medium">{t("askingVsEstimate", { diff: formatChange(Math.abs(diff)).replace(/^[+−-]/, ""), direction: diff > 0 ? t("above") : t("below") })}</p>
                  )}
                  <Link href="/metodologia" className="inline-block text-sm text-brand underline underline-offset-4">{cm("howCalculated")}</Link>
                </div>
              ) : (
                <p className="mt-2 text-muted">{t("estimateNone")}</p>
              )}
            </section>

            {/* price history */}
            <section aria-labelledby="hist">
              <h2 id="hist" className="mb-3 text-xl font-semibold">{t("priceHistory")}</h2>
              {p.priceHistory.length > 1 ? <PriceChart data={p.priceHistory} rent={rent} /> : <p className="text-muted">{t("priceHistoryEmpty")}</p>}
            </section>

            {p.others.length > 0 && (
              <section aria-labelledby="others">
                <h2 id="others" className="mb-1 text-xl font-semibold">{t("otherListings")}</h2>
                <p className="mb-3 text-sm text-muted">{t("otherListingsText")}</p>
                <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
                  {[l, ...p.others].map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <span className="font-medium">{o.advertiserName ?? o.sourceName}</span>
                        <span className="block text-xs text-muted">{o.sourceName} · {t("publishedOn", { date: formatDate(o.publishedAt) })}</span>
                      </span>
                      <span className="tnum font-semibold">{formatEur(o.price)}{rent ? cm("perMonth") : ""}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="loc">
              <h2 id="loc" className="mb-3 text-xl font-semibold">{t("location")}</h2>
              <LocationMap lat={p.lat} lng={p.lng} approximate={p.isSeed} />
              <p className="mt-2 text-xs text-muted">{t("locationNote")}</p>
            </section>

            {zone && (
              <section aria-labelledby="zone">
                <h2 id="zone" className="mb-1 text-xl font-semibold">{t("zone")} · {zone.name}</h2>
                {zone.aggregatedFrom || zone.level !== "municipality" ? (
                  <p className="mb-3 text-sm text-muted">{t("zoneAggregated", { from: p.geo.municipality?.name ?? "", level: zone.name })}</p>
                ) : null}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    [t("zonePrice"), zone.pricePerM2 ? formatPricePerM2(zone.pricePerM2) : "—"],
                    [t("zoneYoy"), zone.yoy != null ? formatChange(zone.yoy) : "—"],
                    [t("zoneYield"), zone.grossYield != null ? f.number(zone.grossYield, { style: "percent", maximumFractionDigits: 1 }) : "—"],
                    [t("zoneDays"), zone.daysOnMarket != null ? t("zoneDaysValue", { n: zone.daysOnMarket }) : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-[14px] bg-surface-2 p-4">
                      <dt className="text-xs text-muted">{k}</dt>
                      <dd className="tnum mt-1 text-lg font-semibold">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2 text-xs text-muted">
                  {t("zoneSample", { n: zone.n, period: f.dateTime(new Date(zone.period), { month: "long", year: "numeric" }) })}
                  {zone.isSeed ? " · demo" : ""} ·{" "}
                  <Link href="/metodologia" className="underline underline-offset-2">{cm("howCalculated")}</Link>
                </p>
              </section>
            )}

            {!rent && l.price > 0 && (
              <section aria-labelledby="calc">
                <h2 id="calc" className="mb-4 text-xl font-semibold">{t("calculators")}</h2>
                <Calculators
                  price={l.price}
                  tables={{
                    euribor: euribor ? { value: euribor.value, validFrom: euribor.validFrom } : null,
                    imtHpp: imtHpp ? { brackets: imtHpp.brackets, validFrom: imtHpp.validFrom, verified: imtHpp.verified } : null,
                    imtOther: imtOther ? { brackets: imtOther.brackets, validFrom: imtOther.validFrom, verified: imtOther.verified } : null,
                    stamp: stamp ? { brackets: stamp.brackets, validFrom: stamp.validFrom } : null,
                  }}
                />
              </section>
            )}

            {comps.length > 0 && (
              <section aria-labelledby="sim">
                <h2 id="sim" className="mb-4 text-xl font-semibold">{t("similar")}</h2>
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {comps.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <PropertyCard
                        compact
                        item={{ id: c.id, propertyId: c.propertyId, reference: c.reference, title: c.title, business: l.business, price: c.price, pricePerM2: c.pricePerM2, area: c.area, typology: c.typology, type: p.type, parish: c.parish, image: c.image }}
                      />
                      <p className="mt-1.5 px-1 text-xs text-muted">
                        {t("similarMatch", { pct: Math.round(c.similarity * 100) })} · {t("similarDistance", { distance: c.distance >= 1000 ? `${(c.distance / 1000).toFixed(1).replace(".", ",")} km` : `${c.distance} m` })}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* sidebar */}
          <aside className="no-print lg:sticky lg:top-24 lg:self-start" aria-label={t("contact")}>
            <div className="rounded-[20px] border border-border bg-surface p-5 shadow-[var(--shadow-md)]">
              <p className="tnum font-display text-3xl font-medium">{priceText}</p>
              <p className="mb-4 mt-1 text-sm text-muted">
                {l.advertiserName ?? "—"}
                {l.verified && ` · ${cm("verified")}`}
              </p>
              <h2 id="contact" className="mb-3 text-base font-semibold">{t("contact")}</h2>
              <ContactForm listingId={l.id} reference={p.reference} whatsappPhone={l.contactPhone} demo={p.isSeed} />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
