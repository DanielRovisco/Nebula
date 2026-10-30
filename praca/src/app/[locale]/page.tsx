import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { unstable_cache } from "next/cache";
import { Sparkline } from "@/components/charts/sparkline";
import { HeroSearch } from "@/components/home/hero-search";
import { NaturalSearch } from "@/components/home/natural-search";
import { JsonLd } from "@/components/json-ld";
import { PropertyCard } from "@/components/property-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatChange, formatPricePerM2 } from "@/lib/format";
import { siteUrl } from "@/lib/env";
import { hotZones } from "@/server/geo";
import { coverage, featuredListings, headlineStats, latestArticles } from "@/server/market";

export const dynamic = "force-dynamic";

const cached = <T,>(fn: () => Promise<T>, key: string) => unstable_cache(fn, ["home", key], { revalidate: 300, tags: ["market"] })();

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const nav = await getTranslations("nav");
  const foot = await getTranslations("footer");
  const f = await getFormatter();

  const [stats, featured, rentals, zones, cov, articles] = await Promise.all([
    cached(headlineStats, "stats").catch(() => []),
    cached(() => featuredListings("sale", 6), "featured").catch(() => []),
    cached(() => featuredListings("rent", 3), "rentals").catch(() => []),
    cached(() => hotZones(6), "zones").catch(() => []),
    cached(coverage, "coverage").catch(() => null),
    cached(() => latestArticles(3), "articles").catch(() => []),
  ]);

  const faq = (["1", "2", "3", "4", "5"] as const).map((n) => ({ q: t(`faq.q${n}`), a: t(`faq.a${n}`) }));

  return (
    <>
      <JsonLd
        data={[
          { "@context": "https://schema.org", "@type": "Organization", name: "Praça", url: siteUrl },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Praça",
            url: siteUrl,
            potentialAction: { "@type": "SearchAction", target: `${siteUrl}/comprar?q={query}`, "query-input": "required name=query" },
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
          },
        ]}
      />

      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden">
        <div className="calcada pointer-events-none absolute -right-24 top-0 hidden h-[460px] w-[55%] rounded-bl-[80px] lg:block" aria-hidden />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="font-display text-[2.6rem] font-medium leading-[1.04] sm:text-6xl lg:text-[4.4rem]">
              {t("heroLine1")}
              <br />
              <span className="text-muted">{t("heroLine2")}</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{t("heroSub")}</p>
            <div className="mt-8 max-w-2xl">
              <HeroSearch />
              <NaturalSearch />
            </div>
          </div>

          <aside aria-labelledby="now-title" className="relative z-10 self-end">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 id="now-title" className="text-lg font-semibold">
                {t("nowTitle")}
              </h2>
              <Link href="/metodologia" className="text-sm text-brand underline-offset-4 hover:underline">
                {foot("methodology")}
              </Link>
            </div>
            <p className="mb-4 text-sm text-muted">{t("nowSub")}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {stats.map((s) => {
                const up = (s.yoy ?? 0) >= 0;
                return (
                  <li key={s.code} className="rounded-[16px] border border-border bg-surface p-4 shadow-[var(--shadow-sm)]">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-muted">{s.label}</p>
                      {s.yoy != null && (
                        <span className={`tnum inline-flex items-center gap-1 text-xs font-semibold ${up ? "text-up" : "text-down"}`}>
                          {up ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                          {formatChange(s.yoy)}
                        </span>
                      )}
                    </div>
                    <p className="tnum mt-1 text-2xl font-semibold tracking-tight">{formatPricePerM2(s.pricePerM2)}</p>
                    <Sparkline
                      className="mt-2 w-full"
                      width={220}
                      height={44}
                      values={s.series.map((x) => x.v)}
                      label={`${s.label}: ${formatPricePerM2(s.pricePerM2)}`}
                    />
                    <p className="mt-1 text-[11px] text-muted">
                      {t("sampleN", { n: s.n })}
                      {s.isSeed ? " · demo" : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          </aside>
        </div>
      </section>

      {/* ───── Featured ───── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6" aria-labelledby="featured-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="featured-title" className="font-display text-3xl font-medium">
                {t("featuredTitle")}
              </h2>
              <p className="mt-1 text-muted">{t("featuredSub")}</p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/comprar">
                {nav("buy")} <ArrowRight aria-hidden />
              </Link>
            </Button>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((l, i) => (
              <li key={l.id}>
                <PropertyCard item={{ ...l, image: l.image }} priority={i < 3} />
              </li>
            ))}
          </ul>
          {rentals.length > 0 && (
            <>
              <h3 className="mb-4 mt-12 text-xl font-semibold">{t("featuredRent")}</h3>
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rentals.map((l) => (
                  <li key={l.id}>
                    <PropertyCard item={{ ...l, image: l.image }} compact />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {/* ───── Hot zones ───── */}
      {zones.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6" aria-labelledby="zones-title">
          <h2 id="zones-title" className="font-display text-3xl font-medium">
            {t("zonesTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-muted">{t("zonesSub")}</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {zones.map((z) => (
              <li key={`${z.districtSlug}/${z.slug}`}>
                <Link
                  href={`/comprar/${z.districtSlug}/${z.slug}`}
                  className="flex items-center justify-between gap-4 rounded-[16px] border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-2"
                >
                  <span>
                    <span className="block text-base font-semibold">{z.name}</span>
                    <span className="tnum block text-sm text-muted">{t("zonesPrice", { price: formatPricePerM2(z.pricePerM2).replace("/m²", "") })}</span>
                  </span>
                  {z.yoy != null && (
                    <Badge tone={z.yoy >= 0 ? "up" : "down"} className="tnum text-sm">
                      {formatChange(z.yoy)}
                    </Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───── Trust: real counts + open sources ───── */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6" aria-labelledby="trust-title">
        <div className="grid gap-8 rounded-[24px] border border-border bg-surface p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 id="trust-title" className="font-display text-3xl font-medium">
              {t("trustTitle")}
            </h2>
            <p className="mt-2 max-w-md text-muted">{t("trustNote")}</p>
            {cov && (
              <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5">
                {[
                  [cov.listings, t("trustListings")],
                  [cov.properties, t("trustProperties")],
                  [cov.municipalities, t("trustMunicipalities")],
                  [cov.duplicatesMerged, t("trustMerged")],
                ].map(([n, label]) => (
                  <div key={String(label)}>
                    <dd className="tnum font-display text-4xl font-medium">{f.number(Number(n))}</dd>
                    <dt className="text-sm text-muted">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold">{t("sourcesTitle")}</h3>
            <p className="mt-1 text-sm text-muted">{t("sourcesSub")}</p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {["DGT · CAOP (limites administrativos)", "INE (estatísticas de habitação)", "Banco de Portugal (taxas)", "OpenStreetMap (mapa e pontos de interesse)", "dados.gov.pt"].map((s) => (
                <li key={s} className="rounded-[10px] bg-surface-2 px-3 py-2.5">
                  {s}
                </li>
              ))}
            </ul>
            <Button asChild variant="link" className="mt-4">
              <Link href="/metodologia">{foot("methodology")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───── Articles ───── */}
      {articles.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6" aria-labelledby="articles-title">
          <h2 id="articles-title" className="font-display text-3xl font-medium">
            {t("articlesTitle")}
          </h2>
          <p className="mt-1 text-muted">{t("articlesSub")}</p>
          <ul className="mt-6 grid gap-5 md:grid-cols-3">
            {articles.map((a) => (
              <li key={a.slug} className="flex flex-col gap-3 rounded-[16px] border border-border bg-surface p-5">
                <div className="flex gap-1.5">
                  {a.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} tone="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="font-display text-xl font-medium leading-snug">{a.title}</h3>
                <p className="text-sm text-muted">{a.excerpt}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ───── FAQ ───── */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6" aria-labelledby="faq-title">
        <h2 id="faq-title" className="font-display text-3xl font-medium">
          {t("faqTitle")}
        </h2>
        <div className="mt-6 divide-y divide-border rounded-[16px] border border-border bg-surface">
          {faq.map((x) => (
            <details key={x.q} className="group px-5 py-4">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                {x.q}
                <span className="text-xl text-muted transition-transform group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="pb-1 pt-2 text-muted">{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ───── CTA ───── */}
      <section className="mx-auto max-w-[1400px] px-4 pb-4 pt-8 sm:px-6">
        <div className="rounded-[24px] bg-brand px-6 py-12 text-brand-fg sm:px-12">
          <h2 className="font-display max-w-2xl text-3xl font-medium sm:text-4xl">{t("ctaTitle")}</h2>
          <p className="mt-3 max-w-xl opacity-90">{t("ctaSub")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand-fg text-brand hover:bg-brand-fg/90">
              <Link href="/entrar">{t("ctaButton")}</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="text-brand-fg hover:bg-white/15">
              <Link href="/comprar">{t("ctaSecondary")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
