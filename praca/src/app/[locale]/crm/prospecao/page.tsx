import { Home } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AddProspectButton, CopyTemplate, ProspectRow } from "@/components/crm/prospect-controls";
import { UpgradeGate } from "@/components/crm/upgrade-gate";
import { PropertyImage } from "@/components/property-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/states";
import { sql } from "@/db";
import { Link } from "@/i18n/navigation";
import { formatEur } from "@/lib/format";
import { crmContext } from "@/server/crm-gate";

export const dynamic = "force-dynamic";

export default async function ProspectingPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ m?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { ctx, allowed, canWrite } = await crmContext("fsbo");
  if (!allowed) return <UpgradeGate />;
  const t = await getTranslations("crm.prospects");
  const sp = await searchParams;
  const munCode = /^\d{4}$/.test(sp.m ?? "") ? sp.m! : null;

  const munis = await sql<{ code: string; name: string; district: string }[]>`SELECT m.code, m.name, d.name AS district FROM geo_municipalities m JOIN geo_districts d ON d.code = m.district_code ORDER BY d.name, m.name`;
  const listings = munCode
    ? await sql<{ property_id: string; reference: string; title: string; price: number; area: number | null; parish: string | null; days: number; drop_pct: number; image: string | null; added: boolean }[]>`
        SELECT p.id AS property_id, p.reference, l.title, l.price::float8 AS price, p.usable_area::float8 AS area, pa.name AS parish,
               GREATEST(EXTRACT(day FROM now() - l.published_at), 0)::int AS days, l.price_drop_pct::float8 AS drop_pct,
               (SELECT url FROM listing_media m WHERE m.listing_id = l.id ORDER BY position LIMIT 1) AS image,
               EXISTS (SELECT 1 FROM prospects x WHERE x.organization_id = ${ctx.orgId} AND x.property_id = p.id) AS added
        FROM listings l JOIN properties p ON p.id = l.property_id LEFT JOIN geo_parishes pa ON pa.code = p.parish_code
        WHERE l.advertiser_type = 'private' AND l.status = 'active' AND l.is_primary AND l.business = 'sale' AND p.deleted_at IS NULL AND p.municipality_code = ${munCode}
        ORDER BY l.published_at DESC LIMIT 40`
    : [];
  const pipeline = await sql<{ id: string; status: string; note: string | null; reference: string; title: string; price: number }[]>`
    SELECT x.id, x.status, x.note, p.reference, (SELECT title FROM listings l WHERE l.property_id = p.id ORDER BY is_primary DESC LIMIT 1) AS title,
           (SELECT price::float8 FROM listings l WHERE l.property_id = p.id ORDER BY is_primary DESC LIMIT 1) AS price
    FROM prospects x JOIN properties p ON p.id = x.property_id WHERE x.organization_id = ${ctx.orgId} ORDER BY x.updated_at DESC LIMIT 100`;

  const template = t("template", { agent: ctx.user.name ?? ctx.user.email, agency: ctx.orgName, ami: "", ref: "PR-000000", zone: "…", email: ctx.brand.email ?? ctx.user.email });
  const districts = [...new Set(munis.map((m) => m.district))];

  return (
    <div className="mx-auto max-w-5xl space-y-12 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-3xl font-medium">{t("title")}</h1>
        <p className="mt-1 max-w-2xl text-muted">{t("sub")}</p>
      </div>

      <section aria-labelledby="fl">
        <h2 id="fl" className="mb-3 text-lg font-semibold">{t("listings")}</h2>
        <form className="flex flex-wrap items-end gap-3" role="search">
          <div><label htmlFor="pm" className="mb-1.5 block text-sm font-medium">{t("area")}</label>
            <Select id="pm" name="m" defaultValue={munCode ?? ""} className="min-w-64"><option value="">{t("areaAny")}</option>{districts.map((d) => <optgroup key={d} label={d}>{munis.filter((m) => m.district === d).map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}</optgroup>)}</Select></div>
          <Button type="submit">{t("search")}</Button>
          <Button asChild variant="soft"><Link href="/comprar?anunciante=particular">{t("alertCta")}</Link></Button>
        </form>
        {munCode && (listings.length === 0 ? (
          <EmptyState icon={<Home className="size-6" aria-hidden />} title={t("listingsEmpty")} text={t("listingsEmptyText")} />
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {listings.map((l) => (
              <li key={l.property_id} className="flex gap-4 rounded-[16px] border border-border bg-surface p-3">
                <div className="relative size-24 shrink-0 overflow-hidden rounded-[12px] bg-surface-2"><PropertyImage src={l.image} alt={l.title} className="size-full" sizes="96px" /></div>
                <div className="min-w-0 flex-1">
                  <Link href={`/imovel/${l.reference.toLowerCase()}`} className="line-clamp-1 font-medium hover:underline">{l.title}</Link>
                  <p className="tnum text-sm">{formatEur(l.price)}{l.area ? ` · ${Math.round(l.area)} m²` : ""}</p>
                  <p className="flex flex-wrap gap-1.5 pt-1 text-xs text-muted"><Badge tone="outline">{t("daysOn", { n: l.days })}</Badge>{l.drop_pct > 0 && <Badge tone="up">{t("drop", { pct: Math.round(l.drop_pct) })}</Badge>}</p>
                  <div className="mt-2">{canWrite ? <AddProspectButton propertyId={l.property_id} added={l.added} /> : null}</div>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </section>

      <section aria-labelledby="pl">
        <h2 id="pl" className="mb-3 text-lg font-semibold">{t("pipeline")}</h2>
        {pipeline.length === 0 ? <p className="text-sm text-muted">{t("pipelineEmpty")}</p> : (
          <ul className="divide-y divide-border rounded-[16px] border border-border bg-surface">
            {pipeline.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 text-sm">
                <div className="min-w-48"><Link href={`/imovel/${p.reference.toLowerCase()}`} className="font-medium hover:underline">{p.reference}</Link><p className="line-clamp-1 text-xs text-muted">{p.title} · {formatEur(p.price)}</p></div>
                <div className="flex-1"><ProspectRow id={p.id} status={p.status} note={p.note} canWrite={canWrite} /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="tp" className="space-y-3">
        <h2 id="tp" className="text-lg font-semibold">{t("templateTitle")}</h2>
        <p className="text-sm text-muted">{t("templateIntro")}</p>
        <CopyTemplate text={template} />
        <aside role="note" className="rounded-[14px] bg-warn-soft p-4 text-sm text-warn"><strong className="block">{t("legalTitle")}</strong>{t("legal")}</aside>
      </section>
    </div>
  );
}
